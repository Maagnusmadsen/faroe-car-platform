/**
 * Outputs the RentLocal logo as a base64 data URL for embedding in emails.
 * Use this in Supabase Auth email templates when the hosted URL fails to load.
 *
 * Run: npx tsx scripts/logo-base64-for-email.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

const pngPath = join(process.cwd(), "public", "logo-light.png");
const buf = readFileSync(pngPath);
const b64 = buf.toString("base64");
const dataUrl = `data:image/png;base64,${b64}`;

const imgTag = `<img src="${dataUrl}" alt="RentLocal" width="120" height="30" style="height:30px;width:auto;" />`;

console.log("Paste this into your Supabase email template (Confirm signup):\n");
console.log(imgTag);
console.log("\n--- Or just the src for an existing img tag ---");
console.log(dataUrl);
