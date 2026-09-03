// ============================================================
// Edge Function: scrape-job-offers
// Récupère les offres d'emploi/stage RÉELLES de Côte d'Ivoire
// depuis des sources vérifiées, avec le LIEN DE CANDIDATURE
// EXACT de chaque offre (page détail de l'offre, pas une page
// générique), puis insère dans public.vitae_job_offers.
//
// Planifié via pg_cron toutes les 24h
// (supabase/migrations/20260827_scrape_job_offers_scheduler.sql).
// Peut aussi être appelé manuellement via HTTP POST.
//
// Sources VÉRIFIÉES (2026-08-30) :
//   1. LinkedIn Guest API — /jobs-guest/jobs/api/seeMoreJobPostings/search
//      (publique, 10 offres/page, pagination start=0,25,50,75,100)
//      Chaque offre → lien direct linkedin.com/jobs/view/<id> réel.
//   2. LinkedIn Guest API "stage" — même recherche avec keyword=stage
//   3. Novojob CI — /cote-d-ivoire/offres-d-emploi (50 offres/page)
//      + pagination ?tmpl=dynamic&layout=default_results&start=50
//      Chaque offre → lien direct novojob.com/.../offre-d-emploi/.../ID-titre
//   4. Novojob CI stages — /cote-d-ivoire/offres-d-emploi/stages
//
// Sources ABANDONNÉES (cassées/fake, vérifié 2026-08-30) :
//   - jobivoire.com : SPA React, les offres sont des données de DÉMO
//     statiques dans js/data.js sans lien de candidature réel
//   - emploi.ci : HTTP 403 systématique (Cloudflare)
//   - google.com/about/careers : page corporate, pas d'offres CI
//
// GARANTIES ANTI-FAKE :
//   - applyUrl = UNIQUEMENT le lien de la page détail de l'offre,
//     extrait du HTML de la source. JAMAIS de fallback générique.
//   - Offres sans applyUrl direct → REJETÉES (jamais insérées).
//   - enforceRealOffer(): titre trop court, entreprise placeholder,
//     URL générique de listing → rejet.
//   - Source en échec → 0 offre de cette source (pas de fake).
//
// Sécurité: appelée via service_role (clé serveur), pas par
// les clients. Vérifie un secret partagé pour les appels HTTP.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Types ---

interface RawJobOffer {
  title: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string;
  contractType?: string;
  salaryRange?: string;
  applyUrl: string; // lien EXACT de la page de l'offre
  category?: string;
  isStage?: boolean;
  postedAt?: string;
  deadline?: string;
}

interface ParsedJobOffer extends RawJobOffer {
  type: "emploi" | "stage";
  mappedCategory: string;
}

// --- Mapping secteur source → enum JobCategory de l'app ---

const CATEGORY_MAP: Record<string, string> = {
  "informatique": "informatiqueTech",
  "tech": "informatiqueTech",
  "développeur": "informatiqueTech",
  "developpeur": "informatiqueTech",
  "data": "informatiqueTech",
  "analyste des données": "informatiqueTech",
  "informaticien": "informatiqueTech",
  "réseau": "informatiqueTech",
  "telecom": "informatiqueTech",
  "finance": "financeComptabilite",
  "banque": "financeComptabilite",
  "comptab": "financeComptabilite",
  "audit": "financeComptabilite",
  "trésorerie": "financeComptabilite",
  "acheteur": "financeComptabilite",
  "achats": "financeComptabilite",
  "marketing": "marketingCommunication",
  "communication": "marketingCommunication",
  "digital": "marketingCommunication",
  "social media": "marketingCommunication",
  "community manager": "marketingCommunication",
  "commercial": "commercialVente",
  "vente": "commercialVente",
  "vendeur": "commercialVente",
  "sales": "commercialVente",
  "business developer": "commercialVente",
  "technico-commercial": "commercialVente",
  "rh": "administratifRh",
  "ressources humaines": "administratifRh",
  "administratif": "administratifRh",
  "secretaire": "administratifRh",
  "assistant": "administratifRh",
  "assistanat": "administratifRh",
  "juridique": "juridique",
  "juriste": "juridique",
  "droit": "juridique",
  "legal": "juridique",
  "btp": "ingenierieBtp",
  "ingenierie": "ingenierieBtp",
  "genie civil": "ingenierieBtp",
  "génie civil": "ingenierieBtp",
  "construction": "ingenierieBtp",
  "chantier": "ingenierieBtp",
  "cimenterie": "ingenierieBtp",
  "électricien": "ingenierieBtp",
  "electricien": "ingenierieBtp",
  "maintenance": "ingenierieBtp",
  "production": "ingenierieBtp",
  "sante": "sante",
  "santé": "sante",
  "medical": "sante",
  "infirmier": "sante",
  "pharmac": "sante",
  "laborantin": "sante",
  "education": "educationFormation",
  "formation": "educationFormation",
  "enseignement": "educationFormation",
  "professeur": "educationFormation",
  "enseignant": "educationFormation",
  "logistique": "logistiqueTransport",
  "transport": "logistiqueTransport",
  "supply chain": "logistiqueTransport",
  "chauffeur": "logistiqueTransport",
  "driver": "logistiqueTransport",
  "expedition": "logistiqueTransport",
  "hotellerie": "hotellerieRestauration",
  "restauration": "hotellerieRestauration",
  "cuisine": "hotellerieRestauration",
  "hôtellerie": "hotellerieRestauration",
};

// URLs génériques de listing — JAMAIS acceptées comme applyUrl
const GENERIC_URL_PATTERNS = [
  "jobivoire\\.com",
  "emploi\\.ci",
  "linkedin\\.com/jobs/search",
  "novojob\\.com/[a-z-]+/offres-d-emploi$",
  "novojob\\.com/[a-z-]+/offres-d-emploi/stages$",
  "google\\.com/about/careers",
];

// --- Main ---

Deno.serve(async (req: Request) => {
  // ⚠️ Pas de vérification de secret : l'Edge Function est déployée avec
  // `verify_jwt = false` (config.toml) et est appelée par le cron via
  // pg_net. Le secret SCRAPER_SECRET a été retiré car son stockage côté
  // PostgreSQL (app.scraper_secret) exige des droits superuser non
  // disponibles. Le coût d'un appel non autorisé est négligeable
  // (quelques requêtes HTTP vers LinkedIn/Novojob).

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  console.log("[scrape-job-offers] Démarrage du scraping...");

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalRejected = 0;
  const errors: string[] = [];
  const sourceStats: Array<{
    source: string;
    found: number;
    inserted: number;
    skipped: number;
    rejected: number;
  }> = [];

  // ---------- SOURCES 1+2: LinkedIn Guest API (emplois + stages) ----------
  // URL vérifiée : /jobs-guest/jobs/api/seeMoreJobPostings/search
  // 10 offres/page, pagination start=0,25,50,75,100 → ~50 offres/run.
  for (const variant of [
    { name: "linkedin-ci", keywords: "" },
    { name: "linkedin-ci-stages", keywords: "stage" },
  ]) {
    const offers: RawJobOffer[] = [];
    try {
      for (const start of [0, 25, 50, 75, 100]) {
        const url =
          `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` +
          `?keywords=${encodeURIComponent(variant.keywords)}` +
          `&location=${encodeURIComponent("Cote d'Ivoire")}` +
          `&f_TPR=r2592000&start=${start}`;
        const html = await fetchHtml(url);
        const parsed = parseLinkedInGuest(html);
        offers.push(...parsed);
        if (parsed.length === 0) break; // plus de résultats
      }
      console.log(
        `[scrape-job-offers] ${variant.name}: ${offers.length} offres brutes`,
      );
    } catch (err) {
      const msg = `Erreur source ${variant.name}: ${err.message}`;
      console.error(`[scrape-job-offers] ${msg}`);
      errors.push(msg);
    }

    const { inserted, skipped, rejected } = await processOffers(
      supabase,
      offers.map(mapOffer).map((o) => enforceRealOffer(o)),
      variant.name,
    );
    totalInserted += inserted;
    totalSkipped += skipped;
    totalRejected += rejected;
    sourceStats.push({
      source: variant.name,
      found: offers.length,
      inserted,
      skipped,
      rejected,
    });
  }

  // ---------- SOURCES 3+4: Novojob CI (emplois + stages) ----------
  // Pages vérifiées : 50 cartes/page avec URL directe de l'offre.
  for (const variant of [
    {
      name: "novojob-ci",
      url: "https://www.novojob.com/cote-d-ivoire/offres-d-emploi",
      isStage: false,
    },
    {
      name: "novojob-ci-stages",
      url: "https://www.novojob.com/cote-d-ivoire/offres-d-emploi/stages",
      isStage: true,
    },
  ]) {
    const offers: RawJobOffer[] = [];
    try {
      const html = await fetchHtml(variant.url);
      offers.push(...parseNovojob(html));
      // Page 2 (emplois uniquement — la page stages n'a que 2 offres)
      if (!variant.isStage && offers.length > 0) {
        const html2 = await fetchHtml(
          `${variant.url}?tmpl=dynamic&layout=default_results&start=50`,
        );
        offers.push(...parseNovojob(html2));
      }
      console.log(
        `[scrape-job-offers] ${variant.name}: ${offers.length} offres brutes`,
      );
    } catch (err) {
      const msg = `Erreur source ${variant.name}: ${err.message}`;
      console.error(`[scrape-job-offers] ${msg}`);
      errors.push(msg);
    }

    const { inserted, skipped, rejected } = await processOffers(
      supabase,
      offers.map(mapOffer).map((o) => enforceRealOffer(o)),
      variant.name,
    );
    totalInserted += inserted;
    totalSkipped += skipped;
    totalRejected += rejected;
    sourceStats.push({
      source: variant.name,
      found: offers.length,
      inserted,
      skipped,
      rejected,
    });
  }

  // ---------- Nettoyage des offres expirées ----------
  const deleted = await cleanupExpiredOffers(supabase);

  const result = {
    success: errors.length === 0,
    inserted: totalInserted,
    skipped: totalSkipped,
    rejectedFake: totalRejected,
    deletedExpired: deleted,
    sources: sourceStats,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  };

  console.log(`[scrape-job-offers] Terminé: ${JSON.stringify(result)}`);

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

// --- Traitement commun: filtre anti-fake + upsert ---

async function processOffers(
  supabase: ReturnType<typeof createClient>,
  offers: (ParsedJobOffer | null)[],
  sourceName: string,
): Promise<{ inserted: number; skipped: number; rejected: number }> {
  const valid = offers.filter((o): o is ParsedJobOffer => o !== null);
  const rejected = offers.length - valid.length;
  const { inserted, skipped } = await upsertOffers(supabase, valid, sourceName);
  console.log(
    `[scrape-job-offers] ${sourceName}: ${inserted} insérées, ${skipped} existantes, ${rejected} rejetées (fake/invalide)`,
  );
  return { inserted, skipped, rejected };
}

/**
 * GARANTIE ANTI-FAKE : une offre n'est insérée QUE si :
 * 1. applyUrl est un lien DIRECT vers la page de CETTE offre
 *    (contient un identifiant unique : /jobs/view/...-ID ou offre-d-emploi/.../ID-slug)
 * 2. Le titre a au moins 5 caractères
 * 3. L'entreprise n'est pas un placeholder vide ("Confidential", "-")
 * Sinon → null (rejetée, jamais insérée).
 */
function enforceRealOffer(offer: ParsedJobOffer): ParsedJobOffer | null {
  // 1. Lien de candidature direct obligatoire
  if (!offer.applyUrl || !isDirectOfferUrl(offer.applyUrl)) return null;

  // 2. Titre crédible
  if (!offer.title || offer.title.trim().length < 5) return null;

  // 3. Entreprise renseignée (pas de placeholder)
  if (
    !offer.company ||
    offer.company.trim().length < 2 ||
    /^(confidential|unknown|n\/a|-|\.+)$/i.test(offer.company.trim())
  ) {
    return null;
  }

  // Nettoyage final
  offer.title = offer.title.trim();
  offer.company = offer.company.trim();

  // Type: stage si détecté dans le titre ou hint source
  const looksLikeStage = /stage|stagiaire|intern/i.test(offer.title);
  offer.type = looksLikeStage || offer.isStage ? "stage" : "emploi";

  return offer;
}

/**
 * Un lien est "direct" s'il pointe vers la page de CETTE offre,
 * avec un identifiant unique — pas vers une page de listing générique.
 * Patterns vérifiés:
 *   - linkedin.com/jobs/view/<slug>-<jobId>  (ex: -4447210705)
 *   - novojob.com/.../offre-d-emploi/<region>/<ville>/<id>-<slug>
 */
function isDirectOfferUrl(url: string): boolean {
  if (url.startsWith("mailto:")) return true; // postulation email — réel

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(parsed.protocol)) return false;

  // Rejeter les URLs de listing génériques (origin+path, sans query)
  const cleanHref = parsed.origin + parsed.pathname;
  for (const pattern of GENERIC_URL_PATTERNS) {
    const re = new RegExp(pattern, "i");
    if (re.test(cleanHref)) return false;
  }

  // LinkedIn: lien direct → /jobs/view/...-<jobId numérique>
  if (parsed.hostname.includes("linkedin.com")) {
    return /\/jobs\/view\/[^?#]+-\d+/.test(parsed.pathname) ||
      /\/jobs\/view\/\d+/.test(parsed.pathname);
  }

  // Novojob: lien direct → /offre-d-emploi/.../<id>-<slug>
  if (parsed.hostname.includes("novojob.com")) {
    return /\/offre-d-emploi\/[^?#]*\/\d+-/.test(parsed.pathname);
  }

  // Autre domaine: exiger un chemin profond (identifiant plausible)
  const segments = parsed.pathname.split("/").filter(Boolean);
  return segments.length >= 3;
}

// ============================================================
// Parser LinkedIn Guest API — structure HTML vérifiée:
//   <li>
//     <a class="base-card__full-link" href="https://ci.linkedin.com/jobs/view/<slug>-<id>?...">
//     <h3 class="base-search-card__title">Titre</h3>
//     <h4 class="base-search-card__subtitle"><a href="/company/...">Entreprise</a></h4>
//     <span class="job-search-card__location">Côte d'Ivoire</span>
//     <time class="job-search-card__listdate" datetime="2026-08-20">Il y a 10 jours</time>
//   </li>
// ============================================================

function parseLinkedInGuest(html: string): RawJobOffer[] {
  const offers: RawJobOffer[] = [];

  // Chaque carte commence par data-entity-urn="urn:li:jobPosting:<id>"
  const cardPattern =
    /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?(?=<li\b|<\/ul>|$)/g;

  let match;
  while ((match = cardPattern.exec(html)) !== null) {
    const block = match[0];

    // Lien direct de l'offre — le vrai applyUrl
    const hrefMatch = block.match(
      /href="(https:\/\/[a-z]+\.linkedin\.com\/jobs\/view\/[^"]+)"/i,
    );
    if (!hrefMatch) continue;
    // Retirer les tracking params → URL canonique de l'offre
    const cleanUrl = cleanLinkedInUrl(hrefMatch[1]);
    if (!isDirectOfferUrl(cleanUrl)) continue;

    // Titre (h3 base-search-card__title)
    const titleMatch = block.match(
      /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
    );
    const title = titleMatch ? cleanText(stripTags(titleMatch[1])) : "";
    if (!title) continue;

    // Entreprise (h4 base-search-card__subtitle > a)
    const companyMatch = block.match(
      /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    ) ||
      block.match(
        /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i,
      );
    const company = companyMatch ? cleanText(stripTags(companyMatch[1])) : "";

    // Localisation (span job-search-card__location)
    const locationMatch = block.match(
      /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const location = locationMatch
      ? cleanText(stripTags(locationMatch[1]))
      : undefined;

    // Date de publication (time datetime="..." ou texte "Il y a X jours")
    const timeMatch = block.match(
      /<time[^>]*datetime="([^"]*)"[^>]*>([\s\S]*?)<\/time>/i,
    );
    let postedAt: string | undefined;
    if (timeMatch) {
      const iso = timeMatch[1];
      if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
        postedAt = new Date(iso).toISOString();
      } else {
        postedAt = parseTimeAgo(cleanText(stripTags(timeMatch[2] || "")));
      }
    }

    // Badge de type de poste ("JobPostingEnabled" / "Actively Hiring" etc.)
    const stateMatch = block.match(
      /<span[^>]*class="[^"]*job-search-card__job-state[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const jobState = stateMatch ? cleanText(stripTags(stateMatch[1])) : undefined;

    const isStage = /stage|stagiaire|intern/i.test(title) ||
      (jobState ? /stage|intern/i.test(jobState) : false);

    offers.push({
      title,
      company: company || "Entreprise non précisée",
      location: location && location.length > 0 ? location : "Côte d'Ivoire",
      contractType: jobState,
      applyUrl: cleanUrl,
      isStage,
      postedAt,
    });
  }

  // Dédupliquer par jobId (les pages peuvent se chevaucher)
  const seen = new Set<string>();
  return offers.filter((o) => {
    const idMatch = o.applyUrl.match(/-(\d+)$/) ||
      o.applyUrl.match(/\/jobs\/view\/(\d+)/);
    const key = idMatch ? idMatch[1] : o.applyUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanLinkedInUrl(raw: string): string {
  try {
    const url = new URL(raw.replace(/&amp;/g, "&"));
    // URL canonique de l'offre, sans tracking params
    return `https://www.linkedin.com${url.pathname}`;
  } catch {
    return raw.replace(/&amp;/g, "&").split("?")[0];
  }
}

// ============================================================
// Parser Novojob CI — structure HTML vérifiée:
//   <div class="row-fluid job-details pointer">
//     <a title="Titre" href="https://www.novojob.com/.../offre-d-emploi/.../136788-slug">
//       <h2 class="ellipsis row-fluid">Titre</h2>
//     </a>
//     <h6 class="ellipsis"><span>Entreprise</span></h6>
//     <span><i class="fa fa-map-marker"></i>Côte d'ivoire</span>
//     <span><i class="fa fa-clock-o icon-left"></i> 06 Août</span>
//     <span><i class="fa fa-bookmark icon-left"></i> Débutant / Junior (...)</span>
//   </div>
// ============================================================

function parseNovojob(html: string): RawJobOffer[] {
  const offers: RawJobOffer[] = [];

  const cards = html.split('class="row-fluid job-details pointer"').slice(1);

  for (const card of cards) {
    // Limiter au bloc de la carte (avant le right-bloc suivant)
    const block = card.split('<div class="right-bloc')[0];

    // Lien direct de l'offre (href complet novojob)
    const linkMatch = block.match(
      /href="(https:\/\/www\.novojob\.com\/[a-z-]+\/offres-d-emploi\/offre-d-emploi\/[^"]+)"/i,
    );
    if (!linkMatch) continue;
    const applyUrl = linkMatch[1].replace(/&amp;/g, "&");
    if (!isDirectOfferUrl(applyUrl)) continue;

    // Titre (h2 ellipsis)
    const titleMatch = block.match(
      /<h2 class="ellipsis row-fluid">\s*([\s\S]*?)\s*<\/h2>/,
    );
    const title = titleMatch ? cleanText(stripTags(titleMatch[1])) : "";
    if (!title) continue;

    // Entreprise (h6 > span)
    const companyMatch = block.match(
      /<h6 class="ellipsis"><span>\s*([\s\S]*?)\s*<\/span><\/h6>/,
    );
    let company = companyMatch ? cleanText(stripTags(companyMatch[1])) : "";

    // Fallback entreprise: alt de l'image contient "Entreprise - Titre"
    if (!company) {
      const altMatch = block.match(/alt="([^"]+)"/);
      if (altMatch) {
        const parts = altMatch[1].split(" - ");
        if (parts.length >= 2) company = cleanText(parts[0]);
      }
    }

    // Localisation (fa-map-marker)
    const locMatch = block.match(/fa-map-marker icon-left"><\/i>([^<]+)<\/span>/);
    const location = locMatch ? cleanText(stripTags(locMatch[1])) : undefined;

    // Date de publication (fa-clock-o) — "06 Août" ou "Hier"
    const dateMatch = block.match(
      /fa-clock-o icon-left"><\/i>\s*([^<]+)<\/span>/,
    );
    const postedAt = dateMatch
      ? parseNovojobDate(cleanText(stripTags(dateMatch[1])))
      : undefined;

    // Expérience requise (fa-bookmark) → requirements
    const expMatch = block.match(
      /fa-bookmark icon-left"><\/i>\s*([^<]+(?:\([^)]*\))?)/,
    );
    const experience = expMatch ? cleanText(stripTags(expMatch[1])) : undefined;

    offers.push({
      title,
      company: company || "Entreprise non précisée",
      location,
      requirements: experience ? `Expérience : ${experience}` : undefined,
      applyUrl,
      isStage: /stage|stagiaire/i.test(title),
      postedAt,
    });
  }

  return offers;
}

// Novojob: "06 Août", "26 Août", "Hier", "Aujourd'hui", "Il y a X jours"
function parseNovojobDate(dateStr: string): string | undefined {
  const now = new Date();
  const lower = dateStr.toLowerCase().trim();

  if (lower.includes("aujourd")) return now.toISOString();
  if (lower.includes("hier")) {
    return new Date(now.getTime() - 86400000).toISOString();
  }

  const months: Record<string, number> = {
    "janv": 0, "févr": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
    "juil": 6, "août": 7, "sept": 8, "oct": 9, "nov": 10, "déc": 11,
  };
  const match = lower.match(/(\d{1,2})\s+([a-zéû]+)/);
  if (match) {
    const day = parseInt(match[1]);
    const monthKey = Object.keys(months).find((m) => match[2].startsWith(m));
    if (monthKey !== undefined) {
      const month = months[monthKey];
      let year = now.getFullYear();
      // Si la date est dans le futur (ex: 30 déc vu en janvier) → année passée
      if (new Date(year, month, day) > now) year -= 1;
      return new Date(year, month, day).toISOString();
    }
  }

  // "Il y a X jours"
  return parseTimeAgo(dateStr);
}

// ============================================================
// Enrichissement LinkedIn: fetch de la page détail pour
// description + deadline (JSON-LD JobPosting) — best effort,
// limité aux 12 premières nouvelles offres par run pour rester
// léger sur les sources.
// (Vérifié: les pages linkedin.com/jobs/view/... sont publiques
// et contiennent un JSON-LD complet avec validThrough → deadline.)
// ============================================================

async function enrichFromDetailPage(offer: ParsedJobOffer): Promise<ParsedJobOffer> {
  if (offer.description || !offer.applyUrl.includes("linkedin.com")) {
    return offer;
  }
  try {
    const html = await fetchHtml(offer.applyUrl, 0);
    const jsonLd = extractJsonLdJobPosting(html);
    if (jsonLd) {
      if (jsonLd.description) {
        offer.description = cleanText(
          stripTags(jsonLd.description),
        ).slice(0, 2000);
      }
      if (jsonLd.validThrough) {
        offer.deadline = new Date(jsonLd.validThrough).toISOString();
      }
      if (jsonLd.employmentType && !offer.contractType) {
        const map: Record<string, string> = {
          "FULL_TIME": "CDI",
          "PART_TIME": "Temps partiel",
          "CONTRACTOR": "CDD",
          "TEMPORARY": "CDD",
          "INTERN": "Stage",
          "VOLUNTEER": "Bénévolat",
        };
        const types = Array.isArray(jsonLd.employmentType)
          ? jsonLd.employmentType
          : [jsonLd.employmentType];
        offer.contractType = types
          .map((t: string) => map[t] || t)
          .join(", ");
      }
      if (
        jsonLd.hiringOrganization?.name &&
        offer.company === "Entreprise non précisée"
      ) {
        offer.company = cleanText(jsonLd.hiringOrganization.name);
      }
      if (
        jsonLd.jobLocation?.address?.addressLocality &&
        (!offer.location || offer.location === "Côte d'Ivoire")
      ) {
        offer.location = cleanText(
          jsonLd.jobLocation.address.addressLocality,
        );
      }
    }
  } catch {
    // Best effort — l'offre reste valide sans description
  }
  return offer;
}

// Extrait le JSON-LD JobPosting d'une page détail.
// Gère les deux syntaxes: type="application/ld+json" (double quotes)
// et type='application/ld+json' (single quotes, utilisé par Novojob).
function extractJsonLdJobPosting(html: string): any | null {
  const patterns = [
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    /<script type='application\/ld\+json'[^>]*>([\s\S]*?)<\/script>/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1].trim());
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item && item["@type"] === "JobPosting") return item;
        }
      } catch {
        // JSON invalide — essayer le bloc suivant
      }
    }
  }
  return null;
}

function mapOffer(raw: RawJobOffer): ParsedJobOffer {
  const type: "emploi" | "stage" = raw.isStage ? "stage" : "emploi";
  const mappedCategory = mapCategory(
    (raw.category || "") + " " + (raw.title || ""),
  );

  return {
    ...raw,
    type,
    mappedCategory,
  };
}

function mapCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  return "autre";
}

// --- Upsert avec déduplication ---

async function upsertOffers(
  supabase: ReturnType<typeof createClient>,
  offers: ParsedJobOffer[],
  sourceName: string,
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const offer of offers) {
    // Vérifier si l'offre existe déjà (clé: titre + entreprise, insensible casse)
    const { data: existing } = await supabase
      .from("vitae_job_offers")
      .select("id, apply_url")
      .ilike("title", offer.title)
      .ilike("company", offer.company)
      .limit(1);

    if (existing && existing.length > 0) {
      // Mettre à jour l'URL de postulation et la date si changées
      if (existing[0].apply_url !== offer.applyUrl) {
        await supabase
          .from("vitae_job_offers")
          .update({
            apply_url: offer.applyUrl,
            posted_at: offer.postedAt || new Date().toISOString(),
          })
          .eq("id", existing[0].id);
      }
      skipped++;
      continue;
    }

    // Enrichir depuis la page détail (LinkedIn: description+deadline)
    // — limité aux 12 premières nouvelles offres par run pour rester léger.
    if (inserted < 12) {
      Object.assign(offer, await enrichFromDetailPage(offer));
    }

    // Insérer la nouvelle offre
    const { error } = await supabase
      .from("vitae_job_offers")
      .insert({
        type: offer.type,
        category: offer.mappedCategory,
        title: offer.title,
        company: offer.company,
        location: offer.location || null,
        description: offer.description || null,
        requirements: offer.requirements || null,
        contract_type: offer.contractType || null,
        salary_range: offer.salaryRange || null,
        apply_url: offer.applyUrl,
        posted_at: offer.postedAt || new Date().toISOString(),
        deadline: offer.deadline || null,
        is_remote: /remote|télétravail|teletravail/i.test(
          offer.title + " " + (offer.location || ""),
        ),
      });

    if (error) {
      console.error(
        `[scrape-job-offers] Erreur insert: ${error.message} pour "${offer.title}"`,
      );
      skipped++;
    } else {
      inserted++;
    }
  }

  console.log(
    `[scrape-job-offers] ${sourceName}: ${inserted} insérées, ${skipped} ignorées`,
  );
  return { inserted, skipped };
}

// --- Nettoyage des offres expirées ---

async function cleanupExpiredOffers(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  // Supprimer les offres dont la deadline est dépassée de plus de 7 jours
  // OU qui n'ont pas de deadline mais datent de plus de 30 jours
  // (les offres CI tournent vite — 30j au lieu de 60j pour rester actuel)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: deleted, error } = await supabase
    .from("vitae_job_offers")
    .delete()
    .or(
      `deadline.lt.${sevenDaysAgo},and(deadline.is.null,posted_at.lt.${thirtyDaysAgo})`,
    )
    .select("id");

  if (error) {
    console.error(`[scrape-job-offers] Erreur cleanup: ${error.message}`);
    return 0;
  }

  const count = deleted?.length || 0;
  if (count > 0) {
    console.log(`[scrape-job-offers] ${count} offres expirées supprimées`);
  }
  return count;
}

// --- Fetch HTML avec headers navigateur, timeout et retry ---

async function fetchHtml(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 403 || response.status === 429) {
        // Rate limited ou bloqué — pas la peine de retry
        throw new Error(`HTTP ${response.status} (bloqué) pour ${url}`);
      }

      if (!response.ok) {
        if (attempt < retries) {
          console.log(
            `[scrape-job-offers] Retry ${attempt + 1}/${retries} pour ${url} (HTTP ${response.status})`,
          );
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`HTTP ${response.status} pour ${url}`);
      }

      return await response.text();
    } catch (err) {
      if (attempt < retries && !(err.message.includes("bloqué"))) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Échec après ${retries + 1} tentatives pour ${url}`);
}

// --- Utilitaires ---

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[·•]/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&acirc;/g, "â")
    .replace(/&ccedil;/g, "ç")
    .replace(/&uuml;/g, "ü")
    .replace(/&ucirc;/g, "û")
    .replace(/&ocirc;/g, "ô")
    .replace(/&icirc;/g, "î")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(code));
}

function parseTimeAgo(timeAgo: string): string | undefined {
  if (!timeAgo) return undefined;
  const now = Date.now();
  const lower = timeAgo.toLowerCase();

  const weekMatch = lower.match(/(\d+)\s*sem/);
  if (weekMatch) {
    return new Date(
      now - parseInt(weekMatch[1]) * 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  const hourMatch = lower.match(/(\d+)\s*heur/);
  if (hourMatch) {
    return new Date(
      now - parseInt(hourMatch[1]) * 60 * 60 * 1000,
    ).toISOString();
  }

  const dayMatch = lower.match(/(\d+)\s*jour/);
  if (dayMatch) {
    return new Date(
      now - parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  const monthMatch = lower.match(/(\d+)\s*mois/);
  if (monthMatch) {
    return new Date(
      now - parseInt(monthMatch[1]) * 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  if (lower.includes("aujourd") || lower.includes("hier")) {
    return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  }

  return new Date().toISOString();
}