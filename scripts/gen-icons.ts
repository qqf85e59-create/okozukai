/**
 * Generate PWA icons from Pixar Ball SVG.
 * Run: node --loader ts-node/esm scripts/gen-icons.ts
 * Or: npx tsx scripts/gen-icons.ts
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="48" fill="white" stroke="#1a1a2e" stroke-width="2"/>
  <path d="M2 50 a48 48 0 0 1 96 0 z" fill="#F1060B"/>
  <path d="M50 2 a48 48 0 0 1 33 14 l-66 66 a48 48 0 0 1 33 -80z" fill="#FFEE15" opacity="0.9"/>
  <polygon points="50,18 56,38 78,38 60,50 67,72 50,58 33,72 40,50 22,38 44,38" fill="#00A651"/>
</svg>`;

const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-180.png", size: 180 },
];

async function main() {
  const outDir = join(process.cwd(), "public", "icons");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const svgBuffer = Buffer.from(SVG);

  for (const { name, size } of SIZES) {
    const png = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    writeFileSync(join(outDir, name), png);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  console.log("Done!");
}

main().catch(console.error);
