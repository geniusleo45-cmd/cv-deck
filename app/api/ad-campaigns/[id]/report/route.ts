import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ranges = {
  "7": { label: "Last 7 days", days: 7 },
  "30": { label: "Last 30 days", days: 30 },
  all: { label: "All activity", days: null },
} as const;
type Range = keyof typeof ranges;
type DailyActivity = { day: Date; impressions: number; clicks: number; cartAdds: number };
type DailySales = { day: Date; units: number; value: number };

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(day: Date) {
  return utcDay(day).toISOString().slice(0, 10);
}

function csvCell(value: string | number) {
  let text = String(value);
  // Avoid spreadsheet formula execution if a text field begins with a formula prefix.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(rows: Array<Array<string | number>>) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "VENDOR") return NextResponse.json({ error: "Vendor access required" }, { status: 403 });

    const { id } = await params;
    const requestedRange = new URL(request.url).searchParams.get("range");
    const range: Range = requestedRange === "30" || requestedRange === "all" ? requestedRange : "7";
    const campaign = await prisma.adCampaign.findFirst({
      where: { id, vendor: { userId: user.id }, status: { in: ["ACTIVE", "EXPIRED"] } },
      select: {
        id: true,
        package: true,
        status: true,
        amount: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        product: { select: { name: true } },
      },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const now = new Date();
    const today = utcDay(now);
    const campaignStartDay = utcDay(campaign.startsAt || campaign.createdAt);
    const campaignEndDay = utcDay(campaign.endsAt && campaign.endsAt < now ? campaign.endsAt : now);
    const requestedStartDay = ranges[range].days
      ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (ranges[range].days - 1)))
      : campaignStartDay;
    const startDay = requestedStartDay > campaignStartDay ? requestedStartDay : campaignStartDay;
    const salesEndExclusive = new Date(today);
    salesEndExclusive.setUTCDate(salesEndExclusive.getUTCDate() + 1);

    const [dailyEvents, paidOrderItems] = await Promise.all([
      prisma.adCampaignEvent.groupBy({
        by: ["day", "type"],
        where: { campaignId: campaign.id, day: { gte: startDay, lte: campaignEndDay } },
        _count: { id: true },
        orderBy: { day: "asc" },
      }),
      prisma.orderItem.findMany({
        where: {
          adCampaignId: campaign.id,
          attributedQuantity: { gt: 0 },
          order: {
            payment: {
              is: {
                status: "SUCCESS",
                verifiedAt: { gte: startDay, lt: salesEndExclusive },
              },
            },
          },
        },
        select: {
          attributedQuantity: true,
          price: true,
          order: { select: { payment: { select: { verifiedAt: true } } } },
        },
      }),
    ]);

    const activityByDay = new Map<string, DailyActivity>();
    for (const event of dailyEvents) {
      const key = dayKey(event.day);
      const activity = activityByDay.get(key) || { day: utcDay(event.day), impressions: 0, clicks: 0, cartAdds: 0 };
      if (event.type === "IMPRESSION") activity.impressions = event._count.id;
      if (event.type === "CLICK") activity.clicks = event._count.id;
      if (event.type === "ADD_TO_CART") activity.cartAdds = event._count.id;
      activityByDay.set(key, activity);
    }

    const activityDayCount = Math.max(0, Math.floor((campaignEndDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const activityRows = Array.from({ length: activityDayCount }, (_, offset) => {
      const day = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), startDay.getUTCDate() + offset));
      return activityByDay.get(dayKey(day)) || { day, impressions: 0, clicks: 0, cartAdds: 0 };
    });

    const salesByDay = new Map<string, DailySales>();
    for (const item of paidOrderItems) {
      const verifiedAt = item.order.payment?.verifiedAt;
      if (!verifiedAt) continue;
      const key = dayKey(verifiedAt);
      const sales = salesByDay.get(key) || { day: utcDay(verifiedAt), units: 0, value: 0 };
      sales.units += item.attributedQuantity;
      sales.value += item.price * item.attributedQuantity;
      salesByDay.set(key, sales);
    }
    const salesRows = [...salesByDay.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
    const impressions = activityRows.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = activityRows.reduce((sum, row) => sum + row.clicks, 0);
    const cartAdds = activityRows.reduce((sum, row) => sum + row.cartAdds, 0);
    const paidUnits = salesRows.reduce((sum, row) => sum + row.units, 0);
    const attributedValue = salesRows.reduce((sum, row) => sum + row.value, 0);

    const rows: Array<Array<string | number>> = [
      ["CV Deck Premium Listing performance export"],
      ["Generated at (UTC)", now.toISOString()],
      ["Campaign ID", campaign.id],
      ["Product", campaign.product.name],
      ["Package", campaign.package],
      ["Campaign status", campaign.status],
      ["Placement cost (NGN)", campaign.amount.toFixed(2)],
      ["Report range", ranges[range].label],
      ["Campaign start (UTC)", campaign.startsAt?.toISOString() || ""],
      ["Campaign end (UTC)", campaign.endsAt?.toISOString() || ""],
      [],
      ["Period summary"],
      ["Metric", "Value"],
      ["Impressions", impressions],
      ["Detail clicks", clicks],
      ["Sponsored card cart adds", cartAdds],
      ["Verified attributed paid units", paidUnits],
      ["Verified attributed merchandise value (NGN)", attributedValue.toFixed(2)],
      [],
      ["Daily sponsored activity (UTC)"],
      ["Date", "Impressions", "Detail clicks", "Sponsored card cart adds"],
      ...activityRows.map((row) => [dayKey(row.day), row.impressions, row.clicks, row.cartAdds]),
      [],
      ["Verified attributed sales by payment date (UTC)"],
      ["Payment date", "Verified paid units", "Attributed merchandise value (NGN)"],
      ...salesRows.map((row) => [dayKey(row.day), row.units, row.value.toFixed(2)]),
    ];

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cv-deck-premium-listing-${campaign.id}-${range}.csv"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Premium Listing CSV export failed:", error);
    return NextResponse.json({ error: "Unable to export campaign performance" }, { status: 500 });
  }
}
