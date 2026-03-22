/**
 * Shared email layout.
 * Marketplace-grade design: hierarchy, readability, CTAs, trust signals.
 * Mobile-friendly, uses env-based URLs.
 */

import { env } from "@/config/env";

export function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return env.baseUrl();
}

/** Brand colors (inline for email client compatibility) */
const BRAND = "#3F8F4F";
const BRAND_HOVER = "#357A43";
const TEXT = "#0f172a";
const TEXT_MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG_CARD = "#f8fafc";

/**
 * Renders an info block for transactional data (dates, amounts, car).
 * Improves scannability and trust.
 */
export function infoBlock(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px;color:${TEXT_MUTED};font-size:13px;border-bottom:1px solid ${BORDER};" width="35%">${r.label}</td><td style="padding:8px 12px;color:${TEXT};font-size:14px;font-weight:600;border-bottom:1px solid ${BORDER};">${r.value}</td></tr>`
    )
    .join("");
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#fff;border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin:20px 0;">
  <tbody>${cells}</tbody>
</table>`;
}

/**
 * Primary CTA button. Min 44px height for touch, prominent.
 */
export function ctaButton(href: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td>
      <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;min-height:48px;padding:14px 28px;background:${BRAND};color:#fff !important;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;line-height:1.25;text-align:center;">${label}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Secondary link (subtle, below CTA).
 */
export function secondaryLink(href: string, label: string): string {
  return `<p style="margin:12px 0 0;font-size:14px;"><a href="${href}" style="color:${BRAND};text-decoration:none;">${label}</a></p>`;
}

export function emailLayout(content: string, title?: string): string {
  const appUrl = getAppUrl();
  const supportEmail = env.supportEmail();
  const brandName = "RentLocal";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title ?? brandName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: ${TEXT}; background: ${BG_CARD}; }
    .wrap { max-width: 600px; margin: 0 auto; padding: 24px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .logo { font-size: 22px; font-weight: 700; color: ${TEXT}; }
    .logo span { color: ${BRAND}; }
    .trust { font-size: 12px; color: ${TEXT_MUTED}; margin-top: 8px; letter-spacing: 0.02em; }
    .content { margin: 28px 0 0; }
    .headline { margin: 0 0 16px; font-size: 22px; font-weight: 700; color: ${TEXT}; line-height: 1.3; }
    .body { margin: 0 0 20px; font-size: 16px; color: ${TEXT}; line-height: 1.6; }
    .body-muted { color: ${TEXT_MUTED}; font-size: 15px; }
    .footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid ${BORDER}; font-size: 13px; color: ${TEXT_MUTED}; }
    .footer a { color: ${BRAND}; text-decoration: none; }
    .footer p { margin: 8px 0 0; }
    .footer p:first-child { margin-top: 0; }
    @media only screen and (max-width: 600px) {
      .wrap { padding: 16px; }
      .card { padding: 28px 20px; }
      .headline { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">Rent<span>Local</span></div>
      <div class="trust">Secure peer-to-peer · Faroe Islands</div>
      <div class="content">${content}</div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
        <p><a href="mailto:${supportEmail}">Contact support</a> · <a href="${appUrl}">Visit RentLocal</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
