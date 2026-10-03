import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarDays, MousePointerClick, ReceiptText, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const ranges = {
  "7": { label: "Last 7 days", days: 7 },
  "30": { label: "Last 30 days", days: 30 },
  all: { label: "All activity", days: null },
} as const;
type Range = keyof typeof ranges;
type DailyMetrics = { day: Date; impressions: number; clicks: number };

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(day: Date) {
  return utcDay(day).toISOString().slice(0, 10);
}

function formatDay(day: Date) {
  return day.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
}

function ctr(clicks: number, impressions: number) {
  return impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—";
}

export default async function CampaignReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { campaignId } = await params;
  const query = await searchParams;
  const range: Range = query.range === "30" || query.range === "all" ? query.range : "7";
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") notFound();

  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, vendor: { userId: user.id }, status: { in: ["ACTIVE", "EXPIRED"] } },
    include: { product: { select: { id: true, name: true } } },
  });
  if (!campaign) notFound();

  const now = new Date();
  const today = utcDay(now);
  const campaignStartDay = utcDay(campaign.startsAt || campaign.createdAt);
  const campaignEndDay = utcDay(campaign.endsAt && campaign.endsAt < now ? campaign.endsAt : now);
  const isLive = campaign.status === "ACTIVE" && campaign.startsAt && campaign.startsAt <= now && campaign.endsAt && campaign.endsAt > now;
  const requestedStartDay = ranges[range].days
    ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (ranges[range].days - 1)))
    : campaignStartDay;
  const startDay = requestedStartDay > campaignStartDay ? requestedStartDay : campaignStartDay;
  const [lifetimeCounts, dailyCounts] = await Promise.all([
    prisma.adCampaignEvent.groupBy({ by: ["type"], where: { campaignId: campaign.id }, _count: { id: true } }),
    prisma.adCampaignEvent.groupBy({
      by: ["day", "type"],
      where: { campaignId: campaign.id, day: { gte: startDay, lte: campaignEndDay } },
      _count: { id: true },
      orderBy: { day: "asc" },
    }),
  ]);

  const lifetimeImpressions = lifetimeCounts.find((item) => item.type === "IMPRESSION")?._count.id || 0;
  const lifetimeClicks = lifetimeCounts.find((item) => item.type === "CLICK")?._count.id || 0;
  const metricsByDay = new Map<string, DailyMetrics>();
  for (const item of dailyCounts) {
    const key = dayKey(item.day);
    const metrics = metricsByDay.get(key) || { day: utcDay(item.day), impressions: 0, clicks: 0 };
    if (item.type === "IMPRESSION") metrics.impressions = item._count.id;
    if (item.type === "CLICK") metrics.clicks = item._count.id;
    metricsByDay.set(key, metrics);
  }

  const dayCount = Math.max(0, Math.floor((campaignEndDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const days = Array.from({ length: dayCount }, (_, offset) => new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), startDay.getUTCDate() + offset)));
  const dailyRows = days.map((day) => metricsByDay.get(dayKey(day)) || { day, impressions: 0, clicks: 0 });
  const periodImpressions = dailyRows.reduce((sum, row) => sum + row.impressions, 0);
  const periodClicks = dailyRows.reduce((sum, row) => sum + row.clicks, 0);
  const maxDailyImpressions = Math.max(...dailyRows.map((row) => row.impressions), 1);
  const filterHref = (nextRange: Range) => `/dashboard/vendor/advertise/${campaign.id}/report${nextRange === "7" ? "" : `?range=${nextRange}`}`;

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/dashboard/vendor/advertise" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600"><ArrowLeft className="h-4 w-4" /> Back to Premium Listings</Link><h1 className="mt-3 flex items-center gap-2 text-2xl font-black"><BarChart3 className="h-6 w-6 text-blue-600" /> Campaign performance</h1><p className="mt-1 text-sm text-gray-500">{campaign.product.name} · {campaign.package.toLowerCase()} Premium Listing</p></div>
        <Link href={`/dashboard/vendor/advertise/${campaign.id}/receipt`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><ReceiptText className="h-4 w-4" /> View receipt</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(ranges) as Range[]).map((item) => <Link key={item} href={filterHref(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${range === item ? "bg-blue-600 text-white" : "border text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>{ranges[item].label}</Link>)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900"><Sparkles className="h-4 w-4 text-amber-500" /><p className="mt-3 text-2xl font-black">{periodImpressions.toLocaleString()}</p><p className="text-xs text-gray-500">{ranges[range].label} impressions</p></div>
        <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900"><MousePointerClick className="h-4 w-4 text-emerald-600" /><p className="mt-3 text-2xl font-black">{periodClicks.toLocaleString()}</p><p className="text-xs text-gray-500">{ranges[range].label} detail clicks</p></div>
        <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900"><BarChart3 className="h-4 w-4 text-blue-600" /><p className="mt-3 text-2xl font-black">{ctr(periodClicks, periodImpressions)}</p><p className="text-xs text-gray-500">Period click-through rate</p></div>
        <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900"><CalendarDays className="h-4 w-4 text-violet-600" /><p className="mt-3 text-2xl font-black">{isLive ? "Live" : "Complete"}</p><p className="text-xs text-gray-500">{campaign.endsAt ? `${isLive ? "Ends" : "Ended"} ${campaign.endsAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}` : "Placement window unavailable"}</p></div>
      </div>

      <section className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black">Daily marketplace activity</h2><p className="mt-1 text-sm text-gray-500">Each bar shows unique sponsored-listing impressions for one UTC day.</p></div><p className="text-xs font-semibold text-gray-500">All-time: {lifetimeImpressions.toLocaleString()} impressions · {lifetimeClicks.toLocaleString()} clicks · {ctr(lifetimeClicks, lifetimeImpressions)} CTR</p></div>
        {dailyRows.length ? <div className="mt-6 space-y-4">{dailyRows.map((row) => <div key={dayKey(row.day)} className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3"><p className="text-xs font-bold text-gray-500">{formatDay(row.day)}</p><div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(row.impressions / maxDailyImpressions) * 100}%` }} /></div><p className="text-right text-xs font-semibold text-gray-600 dark:text-gray-300">{row.impressions.toLocaleString()} · {row.clicks.toLocaleString()}</p></div>)}</div> : <p className="py-10 text-center text-sm text-gray-500">No sponsored-listing activity has been recorded for this period yet.</p>}
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900"><div className="border-b p-5"><h2 className="font-black">Daily breakdown</h2></div><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="p-4">Day</th><th>Impressions</th><th>Clicks</th><th className="pr-4">CTR</th></tr></thead><tbody>{dailyRows.map((row) => <tr key={`table-${dayKey(row.day)}`} className="border-b last:border-0"><td className="p-4 font-semibold">{row.day.toLocaleDateString("en-NG", { dateStyle: "medium", timeZone: "UTC" })}</td><td>{row.impressions.toLocaleString()}</td><td>{row.clicks.toLocaleString()}</td><td className="pr-4 font-bold">{ctr(row.clicks, row.impressions)}</td></tr>)}</tbody></table>{!dailyRows.length && <p className="p-8 text-center text-sm text-gray-500">No activity recorded.</p>}</section>
    </section>
  );
}
