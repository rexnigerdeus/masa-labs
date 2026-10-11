import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Image de partage (WhatsApp, LinkedIn, Twitter…), dessinée en HTML comme
 * celles de Vitae et Hive : le texte reste modifiable dans le code. Générée
 * au build — la page d'entrée est statique — puis servie comme un fichier.
 *
 * La pousse reprend le tracé de `public/icon.svg`, pour que l'aperçu et
 * l'icône installée se reconnaissent. Titres en General Sans, comme dans
 * l'app : le moteur de rendu ne lit ni le woff2 ni les polices variables,
 * d'où deux OTF sous-ensemblés réservés à cette image (`app/fonts/`).
 */
export const alt = 'Sowly — Suis tes habitudes. Gère tes tâches. Sans limite.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const font = (file: string): Promise<Buffer> => readFile(join(process.cwd(), 'app/fonts', file));

export default async function Image() {
  const [semibold, medium] = await Promise.all([
    font('GeneralSans-Semibold-latin.otf'),
    font('GeneralSans-Medium-latin.otf'),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Le fond encre et le vert lumineux du hero de The Everyday Co.
          background: '#171411',
          padding: '0 96px',
          fontFamily: 'General Sans',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 36, fontWeight: 600, color: '#FAFAF7' }}>
            Sowly
            <span style={{ fontSize: 26, fontWeight: 500, color: '#AAA398' }}>· Graines d’Habitudes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 74, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2, color: '#FAFAF7' }}>
            <span>Suis tes habitudes.</span>
            <span>Gère tes tâches.</span>
            <span style={{ color: '#80D193' }}>Sans limite.</span>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {['Gratuit, illimité', 'Hors connexion', 'Sans culpabilité'].map((t) => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  background: '#26211C',
                  color: '#FAFAF7',
                  border: '1px solid #46413B',
                  borderRadius: 999,
                  padding: '12px 22px',
                  fontSize: 23,
                  fontWeight: 500,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Même dessin que public/icon.svg. */}
        <svg width="300" height="300" viewBox="0 0 512 512">
          <defs>
            <linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2F9D4F" />
              <stop offset="1" stopColor="#1E6534" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="112" fill="url(#fond)" />
          <circle cx="128" cy="124" r="44" fill="#FDF150" />
          <g fill="#FAFAF7">
            <path d="M214 440c-4-60 12-116 48-164h22c-26 52-38 110-34 164a18 18 0 01-36 0z" />
            <path d="M262 284c-6-104 50-172 160-172 6 108-54 170-160 172z" />
            <path d="M252 334c4-84-46-136-150-134-6 86 46 136 150 134z" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'General Sans', data: semibold, weight: 600, style: 'normal' },
        { name: 'General Sans', data: medium, weight: 500, style: 'normal' },
      ],
    },
  );
}
