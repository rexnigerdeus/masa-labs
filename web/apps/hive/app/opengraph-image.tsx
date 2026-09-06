import { ImageResponse } from 'next/og';

/**
 * Image de partage.
 *
 * WhatsApp est le canal de diffusion du lancement (brief §6.2) : un lien Hive
 * y circule accompagné de cette image, et c'est souvent le premier contact
 * avec la marque. Elle est dessinée en HTML et rendue à la demande plutôt que
 * stockée en fichier : le texte reste modifiable dans le code, et aucun
 * visiteur ne la télécharge — seuls les robots d'aperçu la demandent.
 */
export const alt = 'Hive — Le Vinted de l’audiovisuel, à Abidjan';
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
          background: '#9A2B32',
          color: '#FDF8F6',
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
              background: '#FDF8F6',
              color: '#9A2B32',
              borderRadius: 14,
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Hive</div>
        </div>

        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>
          Le matériel qui dort chez l’un tourne chez l’autre.
        </div>

        <div style={{ fontSize: 32, color: '#F4E4DE', lineHeight: 1.3 }}>
          Caméras, enceintes, projecteurs, instruments — à louer et à vendre à Abidjan.
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {['Sans commission', 'Paiement en main propre', 'Dans votre commune'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                background: '#C1443D',
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
