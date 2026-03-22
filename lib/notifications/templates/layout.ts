/**
 * Shared email layout.
 * Matches RentLocal branding (logo, green bar, tagline) – same look as Supabase Confirm signup.
 * Table-based for email client compatibility.
 * Logo: embedded as base64 so it always displays (no external URL needed).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { env } from "@/config/env";

function getLogoDataUrl(): string {
  try {
    const path = join(process.cwd(), "public", "logo-light.png");
    const buf = readFileSync(path);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

// Cache at module load – logo doesn't change at runtime
const LOGO_DATA_URL = getLogoDataUrl();

export function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return env.baseUrl();
}

/** Brand colors – match Supabase templates (#15803d) */
const BRAND = "#15803d";
const TEXT = "#0f172a";
const TEXT_MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG = "#f1f5f9";

/**
 * Renders an info block for transactional data (dates, amounts, car).
 */
export function infoBlock(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (r) =>
        `<tr><td style="padding:10px 14px;color:${TEXT_MUTED};font-size:13px;border-bottom:1px solid ${BORDER};" width="35%">${r.label}</td><td style="padding:10px 14px;color:${TEXT};font-size:14px;font-weight:600;border-bottom:1px solid ${BORDER};">${r.value}</td></tr>`
    )
    .join("");
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#fff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin:20px 0;">
  <tbody>${cells}</tbody>
</table>`;
}

/**
 * Primary CTA button – matches Supabase Confirm signup style.
 */
export function ctaButton(href: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:12px;background-color:${BRAND};box-shadow:0 2px 6px rgba(0,0,0,0.10);">
      <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:16px 32px;font-size:17px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:12px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

/**
 * Secondary link (subtle, below CTA).
 */
export function secondaryLink(href: string, label: string): string {
  return `<p style="margin:12px 0 0;font-size:14px;"><a href="${href}" style="color:${BRAND};text-decoration:underline;">${label}</a></p>`;
}

/**
 * Full email wrapper – logo, green bar, footer. Same structure as Supabase Confirm signup.
 * Logo: embedded base64 (works in all email clients; no external URL).
 */
export function emailLayout(content: string, title?: string): string {
  const appUrl = getAppUrl();
  const supportEmail = env.supportEmail();
  const brandName = "RentLocal";
  const logoSrc = LOGO_DATA_URL || `${appUrl}/logo-light.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title ?? brandName}</title>
  <style>
    .headline { margin:0 0 16px; font-size:24px; font-weight:700; color:${TEXT}; line-height:1.3; }
    .body { margin:0 0 16px; font-size:16px; color:${TEXT}; line-height:1.6; }
    .body-muted { color:${TEXT_MUTED}; font-size:15px; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 10px rgba(15,23,42,0.08);overflow:hidden;">
          <tr>
            <td style="height:4px;background-color:${BRAND};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid ${BORDER};">
              <img src="${logoSrc}" alt="${brandName}" style="display:block;margin:0 auto;max-width:180px;height:auto;">
              <p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:${TEXT_MUTED};">
                Rent cars from locals in the Faroe Islands
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <div class="content" style="margin:0;">
                ${content}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;text-align:center;background-color:#f8fafc;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${TEXT_MUTED};">
                You're receiving this email because you use RentLocal.
              </p>
              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${TEXT_MUTED};">
                Need help? <a href="mailto:${supportEmail}" style="color:${TEXT_MUTED};text-decoration:underline;">Contact support</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:${TEXT_MUTED};">
                © ${new Date().getFullYear()} ${brandName} · Faroe Islands
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
