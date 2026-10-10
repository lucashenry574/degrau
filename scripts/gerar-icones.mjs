// Gera os ícones PNG do app (três degraus brancos sobre o azul) sem depender de biblioteca de imagem.
// Uso: npm run icones
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BLUE = [0x4a, 0x6d, 0xa7];
const WHITE = [255, 255, 255];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/** Retângulo arredondado em coordenadas de 0 a 32 (o mesmo desenho do logo SVG). */
function inRoundRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
const STEPS = [
  { x: 3, y: 20, w: 8, h: 9, a: 0.6 },
  { x: 12, y: 13, w: 8, h: 16, a: 0.8 },
  { x: 21, y: 5, w: 8, h: 24, a: 1 }
];

/** inset: margem em fração do lado (o ícone maskable precisa de área segura maior). */
function icon(size, { inset, roundBg }) {
  return png(size, (px, py) => {
    const u = px / size;
    const v = py / size;
    if (roundBg) {
      const r = 0.22;
      const cx = Math.min(Math.max(u, r), 1 - r);
      const cy = Math.min(Math.max(v, r), 1 - r);
      if ((u - cx) ** 2 + (v - cy) ** 2 > r * r) return [0, 0, 0, 0];
    }
    const x = ((u - inset) / (1 - 2 * inset)) * 32;
    const y = ((v - inset) / (1 - 2 * inset)) * 32;
    for (const s of STEPS) {
      if (inRoundRect(x, y, s.x, s.y, s.w, s.h, 2)) {
        return [0, 1, 2].map((i) => Math.round(BLUE[i] + (WHITE[i] - BLUE[i]) * s.a)).concat(255);
      }
    }
    return [...BLUE, 255];
  });
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', icon(192, { inset: 0.12, roundBg: true }));
writeFileSync('public/icon-512.png', icon(512, { inset: 0.12, roundBg: true }));
writeFileSync('public/icon-maskable-512.png', icon(512, { inset: 0.22, roundBg: false }));
writeFileSync('public/apple-touch-icon.png', icon(180, { inset: 0.14, roundBg: false }));
writeFileSync('public/favicon.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#4A6DA7"/>' +
  '<g transform="translate(4 4) scale(.75)"><rect x="3" y="20" width="8" height="9" rx="2" fill="#fff" opacity=".6"/>' +
  '<rect x="12" y="13" width="8" height="16" rx="2" fill="#fff" opacity=".8"/><rect x="21" y="5" width="8" height="24" rx="2" fill="#fff"/></g></svg>\n');
console.log('Ícones gerados em public/.');
