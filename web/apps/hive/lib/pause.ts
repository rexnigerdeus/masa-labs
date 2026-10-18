/**
 * Hive est en pause depuis le 17 octobre 2026 (brief v2 de la vitrine,
 * « Archivage de Hive »).
 *
 * Le code et la base sont gardés ; le public ne voit plus qu'une page
 * d'attente. Trois verrous, du plus visible au plus sûr :
 *   1. middleware.ts renvoie toute route vers `/` ;
 *   2. chaque action serveur d'écriture appelle `refuseWhilePaused()` —
 *      une action reste appelable par son identifiant même quand plus
 *      aucune page ne l'affiche ;
 *   3. la base refuse les écritures (politiques RLS restrictives,
 *      supabase/en-attente/20261018100000_hive_pause.sql).
 * Rouvrir : voir le README de l'app.
 */
export const HIVE_PAUSED = true;

export function refuseWhilePaused(): void {
  if (HIVE_PAUSED) {
    throw new Error('Hive fait une pause : cette action est fermée.');
  }
}

/** Lien de repli vers Vitae, marqué pour mesurer ce que Hive lui envoie. */
export const VITAE_LINK: string = (() => {
  const base = process.env.NEXT_PUBLIC_VITAE_URL || 'https://vitae-lemon.vercel.app';
  const url = new URL('/', base);
  url.searchParams.set('ref', 'hive');
  return url.toString();
})();
