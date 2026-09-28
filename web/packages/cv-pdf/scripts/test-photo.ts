import { deflateSync } from 'node:zlib';

/**
 * Photo de test, fabriquee ici plutot que lue sur le disque.
 *
 * Deux aplats dans un PNG de 48 px : ca ne ressemble a personne, et ca suffit
 * pour ce qu'on verifie — qu'une image posee dans l'en-tete ne deplace ni ne
 * masque le texte que le logiciel de tri va lire.
 */
export function testPhoto(): string {
  const SIDE = 48;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = (bytes: Buffer): number => {
    let c = 0xffffffff;
    for (const b of bytes) c = (table[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([head, body, crc]);
  };

  const raw: number[] = [];
  for (let y = 0; y < SIDE; y += 1) {
    raw.push(0); // octet de filtre : aucun
    for (let x = 0; x < SIDE; x += 1) {
      const head = (x - SIDE / 2) ** 2 + (y - SIDE * 0.42) ** 2 < (SIDE * 0.2) ** 2;
      raw.push(...(head ? [93, 107, 119] : [201, 214, 227]));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIDE, 0);
  ihdr.writeUInt32BE(SIDE, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 2; // couleur vraie, sans alpha
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}
