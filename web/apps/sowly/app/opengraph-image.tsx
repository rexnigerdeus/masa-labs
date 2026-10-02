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
          background: '#F7F8F5',
          padding: '0 96px',
          fontFamily: 'General Sans',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 36, fontWeight: 600, color: '#245A33' }}>
            Sowly
            <span style={{ fontSize: 26, fontWeight: 500, color: '#5B614F' }}>· Graines d’Habitudes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 74, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2, color: '#20231C' }}>
            <span>Suis tes habitudes.</span>
            <span>Gère tes tâches.</span>
            <span style={{ color: '#327141' }}>Sans limite.</span>
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
                  background: '#DEEEE1',
                  color: '#245A33',
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

        <svg width="300" height="300" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="112" fill="#327141" />
          <g transform="translate(-12 -14)" fill="#F7F8F5">
            <path d="M268 274c0-96 56-150 148-150 0 92-56 150-148 150z" />
            <path d="M268 306c0-74-44-112-124-112 0 74 44 112 124 112z" />
            <rect x="246" y="266" width="44" height="174" rx="22" />
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
