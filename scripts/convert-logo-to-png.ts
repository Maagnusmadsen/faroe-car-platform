/**
 * Converts logo-light.svg to logo-light.png for use in emails.
 * Run: npx tsx scripts/convert-logo-to-png.ts
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const publicDir = join(process.cwd(), "public");
const svgPath = join(publicDir, "logo-light.svg");
const pngPath = join(publicDir, "logo-light.png");

const svgBuffer = readFileSync(svgPath);

sharp(svgBuffer)
  .resize(240, 60) // Reasonable size for email header
  .png()
  .toFile(pngPath)
  .then(() => console.log("Created", pngPath))
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
