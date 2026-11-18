import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Image de partage (WhatsApp, LinkedIn, Twitter…), dessinée en HTML comme
 * celles de Vitae et Hive : le texte reste modifiable dans le code. Générée
 * au build — la page d'entrée est statique — puis servie comme un fichier.
 *
 * Le style du hub (brief design) : un aplat lagune, le titre serré en
 * Bricolage et sa fin en Instrument Serif italique, l'icône en carré
 * d'encre. Le moteur de rendu ne lit ni le woff2 ni les polices variables :
 * `app/fonts/` garde trois TTF statiques tirés des polices du hub
 * (Bricolage figée à 700 et 78 % de largeur), réservés à cette image.
 * Couleurs écrites en dur : une image n'a pas de thème.
 */
export const alt = 'Sowly — Suis tes habitudes. Gère tes tâches. Sans limite.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const font = (file: string): Promise<Buffer> => readFile(join(process.cwd(), 'app/fonts', file));

const INK = '#06231F';

export default async function Image() {
  const [bricolage, instrument, hanken] = await Promise.all([
    font('Bricolage-Bold-78.ttf'),
    font('InstrumentSerif-Italic-latin.ttf'),
    font('HankenGrotesk-Medium-latin.ttf'),
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
          background: '#ECEAF4',
          padding: 40,
          fontFamily: 'Hanken',
        }}
      >
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#10B5A5',
            borderRadius: 28,
            padding: '0 64px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 680 }}>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', color: INK, opacity: 0.72 }}>
              Sowly · graines d’habitudes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Bricolage', fontSize: 84, lineHeight: 1.02, letterSpacing: -2, color: INK }}>
              <span>Suis tes habitudes.</span>
              <span>Gère tes tâches.</span>
              <span style={{ fontFamily: 'Instrument Serif', fontSize: 92, letterSpacing: 0 }}>Sans limite.</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Gratuit, illimité', 'Hors connexion', 'Sans culpabilité'].map((t) => (
                <div
                  key={t}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    background: 'rgba(255,255,255,.32)',
                    color: INK,
                    borderRadius: 999,
                    padding: '10px 20px',
                    fontSize: 22,
                    fontWeight: 500,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Même dessin que public/icon.svg. */}
          <svg width="260" height="260" viewBox="0 0 512 512" style={{ transform: 'rotate(4deg)' }}>
            <rect width="512" height="512" rx="144" fill="#18122B" />
            <circle cx="128" cy="124" r="44" fill="#FFB627" />
            <g fill="#10B5A5">
              <path d="M214 440c-4-60 12-116 48-164h22c-26 52-38 110-34 164a18 18 0 01-36 0z" />
              <path d="M262 284c-6-104 50-172 160-172 6 108-54 170-160 172z" />
              <path d="M252 334c4-84-46-136-150-134-6 86 46 136 150 134z" />
            </g>
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Bricolage', data: bricolage, weight: 700, style: 'normal' },
        { name: 'Instrument Serif', data: instrument, weight: 400, style: 'normal' },
        { name: 'Hanken', data: hanken, weight: 500, style: 'normal' },
      ],
    },
  );
}
