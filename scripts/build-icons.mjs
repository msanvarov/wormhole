import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public", "wormhole-static.svg");
const sizes = [16, 32, 48, 128];

const svg = await readFile(source);

for (const size of sizes) {
  const out = join(root, "public", `icon-${size}.png`);
  await sharp(svg, { density: Math.max(72, size * 3) })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

const logoOut = join(root, "public", "logo.png");
await sharp(svg, { density: 512 })
  .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(logoOut);
console.log("wrote", logoOut);
