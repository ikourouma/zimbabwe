// One-off generator for the site favicon/app-icon set, derived from the existing Zimbabwe
// map+flag brand asset (public/brand/zimbabwe-map-icon.png). Run with: node scripts/generate-favicon.js
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const SRC = path.join(__dirname, "..", "public", "brand", "zimbabwe-map-icon.png");
const APP_DIR = path.join(__dirname, "..", "app");

/** Composites a trimmed square-canvas PNG buffer at `size`, with the artwork inset by `padPct`
 *  of the canvas (so the country outline isn't flush against the very edge at tiny render sizes). */
async function squareIcon(trimmedBuffer, size, padPct = 0.06) {
  const inner = Math.round(size * (1 - padPct * 2));
  const resized = await sharp(trimmedBuffer)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  const trimmed = await sharp(SRC).trim({ threshold: 5 }).toBuffer();

  const [png16, png32, png512, apple180] = await Promise.all([
    squareIcon(trimmed, 16, 0.02),
    squareIcon(trimmed, 32, 0.03),
    squareIcon(trimmed, 512, 0.05),
    squareIcon(trimmed, 180, 0.08),
  ]);

  // Minimal valid .ico container holding modern PNG-compressed image entries — every current
  // browser supports PNG-in-ICO, so this avoids pulling in an extra dependency for two frames.
  const icoFrames = [
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
  ];
  const headerSize = 6 + 16 * icoFrames.length;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icoFrames.length, 4);
  icoFrames.forEach(({ size, buf }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buf.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  const ico = Buffer.concat([header, ...icoFrames.map((f) => f.buf)]);

  fs.writeFileSync(path.join(APP_DIR, "favicon.ico"), ico);
  fs.writeFileSync(path.join(APP_DIR, "icon.png"), png512);
  fs.writeFileSync(path.join(APP_DIR, "apple-icon.png"), apple180);

  console.log("Wrote app/favicon.ico, app/icon.png (512x512), app/apple-icon.png (180x180)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
