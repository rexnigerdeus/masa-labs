import { ImageResponse } from 'next/og';

/**
 * Image de partage.
 *
 * Un lien Vitae circule surtout par WhatsApp et LinkedIn, entre candidats :
 * cette image est le premier contact avec le produit. Dessinée en HTML et
 * rendue à la demande plutôt que stockée en fichier — le texte reste
 * modifiable dans le code, et seuls les robots d'aperçu la téléchargent.
 */
export const alt = 'Vitae — Le CV qui passe les filtres';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          background: '#17210C',
          color: '#F1F1EF',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#6FAE2E',
              color: '#17210C',
              borderRadius: 14,
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Vitae</div>
        </div>

        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>
          Le CV qui passe les filtres.
        </div>

        <div style={{ fontSize: 32, color: '#DFF3D0', lineHeight: 1.3 }}>
          La plupart des candidatures sont écartées par un logiciel avant d’être lues.
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {['Compatible ATS', 'Score en direct', 'PDF gratuit, sans filigrane'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                background: '#5C9226',
                borderRadius: 999,
                padding: '10px 22px',
                fontSize: 24,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
