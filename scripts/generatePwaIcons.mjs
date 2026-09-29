import fs from "fs";
import path from "path";
import zlib from "zlib";

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function createPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 4));
  const pad = Math.floor(width * 0.18);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      const inStripe =
        x >= pad &&
        x <= width - pad &&
        y >= Math.floor(height * 0.36) &&
        y <= Math.floor(height * 0.64);
      if (inStripe) {
        // #E10600 Racing Red
        raw[p] = 225;
        raw[p + 1] = 6;
        raw[p + 2] = 0;
        raw[p + 3] = 255;
      } else {
        // #15151E Dark Racing Minimalista
        raw[p] = 21;
        raw[p + 1] = 21;
        raw[p + 2] = 30;
        raw[p + 3] = 255;
      }
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192x192.png"), createPng(192, 192));
fs.writeFileSync(path.join(dir, "icon-512x512.png"), createPng(512, 512));
fs.writeFileSync(path.join(dir, "apple-touch-icon.png"), createPng(180, 180));
console.log("PWA icons generated in public/icons.");
