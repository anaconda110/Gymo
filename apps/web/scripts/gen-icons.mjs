// 生成 PWA 图标 PNG（192x192 / 512x512），纯 Node 内置 zlib，无任何依赖。
// 用法：node scripts/gen-icons.mjs
// 产物：public/icon-192.png public/icon-512.png public/maskable-512.png
//
// 设计：暗底 #0f0f10 圆角方块 + 橙色杠铃（与 favicon.svg 一致），纯本地像素绘制。

import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
mkdirSync(PUBLIC, { recursive: true });

const BG = [0x0f, 0x0f, 0x10];
const ORANGE = [0xff, 0x5a, 0x1f];
const WHITE = [0xf5, 0xf5, 0xf7];

// CRC32 表
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// 绘制 RGBA 像素缓冲并编码为 PNG
function makePNG(size, { maskable = false } = {}) {
  const W = size;
  const H = size;
  const px = new Uint8Array(W * H * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const fill = (x0, y0, x1, y1, c) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c);
  };

  // 背景
  const radius = Math.round(size * 0.22);
  if (maskable) {
    fill(0, 0, W, H, BG);
  } else {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let inside = true;
        if (x < radius && y < radius) inside = Math.hypot(radius - x, radius - y) <= radius;
        else if (x > W - 1 - radius && y < radius) inside = Math.hypot(W - 1 - radius - x, radius - y) <= radius;
        else if (x < radius && y > H - 1 - radius) inside = Math.hypot(radius - x, H - 1 - radius - y) <= radius;
        else if (x > W - 1 - radius && y > H - 1 - radius) inside = Math.hypot(W - 1 - radius - x, H - 1 - radius - y) <= radius;
        if (inside) set(x, y, BG);
      }
    }
  }

  // 杠铃几何（按 64 viewBox 缩放）
  const s = size / 64;
  const R = Math.round;
  fill(R(8 * s), R(30 * s), R(14 * s), R(34 * s), ORANGE);
  fill(R(50 * s), R(30 * s), R(56 * s), R(34 * s), ORANGE);
  fill(R(14 * s), R(28 * s), R(18 * s), R(36 * s), WHITE);
  fill(R(46 * s), R(28 * s), R(50 * s), R(36 * s), WHITE);
  fill(R(18 * s), R(24 * s), R(46 * s), R(40 * s), ORANGE);
  fill(R(18 * s), R(31 * s), R(46 * s), R(33 * s), BG);

  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const o = y * (W * 4 + 1) + 1 + x * 4;
      raw[o] = px[i];
      raw[o + 1] = px[i + 1];
      raw[o + 2] = px[i + 2];
      raw[o + 3] = px[i + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function write(path, buf) {
  writeFileSync(path, buf);
  console.log('wrote', path, buf.length, 'bytes');
}

write(join(PUBLIC, 'icon-192.png'), makePNG(192));
write(join(PUBLIC, 'icon-512.png'), makePNG(512));
write(join(PUBLIC, 'maskable-512.png'), makePNG(512, { maskable: true }));
console.log('done');