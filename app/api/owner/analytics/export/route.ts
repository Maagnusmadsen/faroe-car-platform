/**
 * Owner analytics CSV export.
 * GET /api/owner/analytics/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

import { requireAuth } from "@/auth/guards";
import { getOwnerExportRows } from "@/lib/owner-analytics";

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(row: Record<string, string | number>): string {
  return ["booking_id", "car_name", "renter_name", "trip_start", "trip_end", "rental_price", "platform_fee", "stripe_fee", "net_payout"]
    .map((k) => escapeCsvCell(row[k] ?? ""))
    .join(",");
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const ownerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const rows = await getOwnerExportRows(ownerId, from, to);

    const header = "booking_id,car_name,renter_name,trip_start,trip_end,rental_price,platform_fee,stripe_fee,net_payout";
    const body = rows.map((r) => toCsvRow(r)).join("\n");
    const csv = header + "\n" + body;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="owner-financial-export-${from ?? "all"}-${to ?? "all"}.csv"`,
      },
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return new Response(JSON.stringify({ error: e.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Export failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
