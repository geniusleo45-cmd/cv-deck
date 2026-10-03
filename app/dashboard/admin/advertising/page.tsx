import Link from "next/link";
import { BarChart3, Clock3, Megaphone, MousePointerClick, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

const campaignStatuses = ["DRAFT", "PENDING_PAYMENT", "ACTIVE", "EXPIRED", "CANCELLED"] as const;
type CampaignStatus = (typeof campaignStatuses)[number];
type CampaignMetrics = { impressions: number; clicks: number; cartAdds: number };

function effectiveStatus(status: CampaignStatus, endsAt: Date | null, now: Date) {
  return status === "ACTIVE" && endsAt && endsAt <= now ? "EXPIRED" : status;
}

function statusLabel(status: string) {
  return status.split("_").map((word) => word[0] + word.slice(1).toLowerCase()).join(" ");
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (status === "PENDING_PAYMENT") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  if (status === "EXPIRED") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (status === "CANCELLED") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
}

function providerLabel(provider: string | null) {
  if (provider === "PAYSTACK") return "Paystack";
  if (provider === "FLUTTERWAVE") return "Flutterwave";
  return "Not selected";
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—";
}

function ctr(clicks: number, impressions: number) {
  return impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—";
}

export default async function AdminAdvertisingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const selectedStatus: CampaignStatus | "ALL" = campaignStatuses.some((status) => status === query.status)
    ? query.status as CampaignStatus
    : "ALL";
  const now = new Date();
  const campaignWhere = selectedStatus === "ALL" ? {} : { status: selectedStatus };

  const [paidCampaigns, livePromotions, pendingPayments, campaigns] = await Promise.all([
    prisma.adCampaign.aggregate({
      where: { status: { in: ["ACTIVE", "EXPIRED"] } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.adCampaign.count({
      where: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
    }),
    prisma.adCampaign.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.adCampaign.findMany({
      where: campaignWhere,
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, status: true, stock: true } },
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const eventCounts = campaignIds.length
    ? await prisma.adCampaignEvent.groupBy({
      by: ["campaignId", "type"],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    })
    : [];
  const metricsByCampaign = new Map<string, CampaignMetrics>();
  for (const event of eventCounts) {
    const metrics = metricsByCampaign.get(event.campaignId) || { impressions: 0, clicks: 0, cartAdds: 0 };
    if (event.type === "IMPRESSION") metrics.impressions = event._count.id;
    if (event.type === "CLICK") metrics.clicks = event._count.id;
    if (event.type === "ADD_TO_CART") metrics.cartAdds = event._count.id;
    metricsByCampaign.set(event.campaignId, metrics);
  }

  const filterHref = (nextStatus: CampaignStatus | "ALL") => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    const value = params.toString();
    return `/dashboard/admin/advertising${value ? `?${value}` : ""}`;
  };

  const cards = [
    { label: "Premium listing revenue", value: `₦${(paidCampaigns._sum.amount || 0).toLocaleString()}`, detail: `${paidCampaigns._count.id} paid campaign${paidCampaigns._count.id === 1 ? "" : "s"}`, icon: Megaphone, tone: "text-amber-600" },
    { label: "Live promotions", value: livePromotions.toLocaleString(), detail: "Currently eligible for featured placement", icon: Sparkles, tone: "text-emerald-600" },
    { label: "Pending payment", value: pendingPayments.toLocaleString(), detail: "Awaiting vendor checkout", icon: Clock3, tone: "text-blue-600" },
    { label: "Campaigns shown", value: campaigns.length.toLocaleString(), detail: selectedStatus === "ALL" ? "Most recent 100 campaigns" : `${statusLabel(selectedStatus)} campaigns`, icon: BarChart3, tone: "text-violet-600" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Megaphone className="h-6 w-6 text-amber-500" /> Premium Listings</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Review paid marketplace placements, their current window, and the engagement recorded for each promotion.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><Sparkles className="h-4 w-4" /> Read-only operations view</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <div className="flex items-center justify-between text-sm text-gray-500"><span>{label}</span><Icon className={`h-4 w-4 ${tone}`} /></div>
            <p className="mt-2 text-2xl font-black">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", ...campaignStatuses] as const).map((status) => (
          <Link key={status} href={filterHref(status)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${selectedStatus === status ? "bg-blue-600 text-white" : "border text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
            {status === "ALL" ? "All campaigns" : statusLabel(status)}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5">
          <div><h2 className="font-bold">Promotion activity</h2><p className="mt-1 text-xs text-gray-500">Active and expired campaigns are paid placements. An overdue active campaign is displayed as expired until the hourly maintenance task updates it.</p></div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500"><MousePointerClick className="h-3.5 w-3.5" /> One daily event per browser</span>
        </div>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead><tr className="border-b text-xs text-gray-500"><th className="p-4">Product</th><th>Vendor</th><th>Package & payment</th><th>Placement window</th><th>Engagement</th><th className="pr-4">Status</th></tr></thead>
          <tbody>
            {campaigns.map((campaign) => {
              const status = effectiveStatus(campaign.status, campaign.endsAt, now);
              const metrics = metricsByCampaign.get(campaign.id) || { impressions: 0, clicks: 0, cartAdds: 0 };
              const live = status === "ACTIVE" && campaign.startsAt && campaign.startsAt <= now && campaign.endsAt && campaign.endsAt > now;
              return (
                <tr key={campaign.id} className="border-b align-top last:border-0">
                  <td className="p-4"><Link href={`/dashboard/marketplace/${campaign.product.id}`} className="font-bold text-gray-900 hover:text-blue-600 hover:underline dark:text-white">{campaign.product.name}</Link><p className="mt-1 text-xs text-gray-500">{campaign.product.status} · {campaign.product.stock} in stock</p></td>
                  <td className="py-4 pr-4"><Link href={`/vendors/${campaign.vendor.id}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline dark:text-white">{campaign.vendor.businessName}</Link><p className="mt-1 text-xs text-gray-500">{campaign.vendor.user.name || campaign.vendor.user.email}</p><p className={`mt-1 text-[10px] font-bold ${campaign.vendor.status === "VERIFIED" ? "text-emerald-600" : "text-amber-600"}`}>{campaign.vendor.status}</p></td>
                  <td className="py-4 pr-4"><p className="font-bold">{statusLabel(campaign.package)}</p><p className="mt-1 text-xs font-semibold text-emerald-600">₦{campaign.amount.toLocaleString()}</p><p className="mt-1 text-xs text-gray-500">{providerLabel(campaign.paymentProvider)}</p></td>
                  <td className="py-4 pr-4"><p className="font-semibold">{campaign.startsAt ? `${formatDate(campaign.startsAt)} → ${formatDate(campaign.endsAt)}` : "Starts after payment"}</p><p className={`mt-1 text-xs font-bold ${live ? "text-emerald-600" : "text-gray-500"}`}>{live ? "Live now" : `Created ${formatDate(campaign.createdAt)}`}</p></td>
                  <td className="py-4 pr-4"><p className="font-bold">{metrics.impressions.toLocaleString()} <span className="font-normal text-gray-500">impressions</span></p><p className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{metrics.clicks.toLocaleString()} clicks · {metrics.cartAdds.toLocaleString()} cart adds · {ctr(metrics.clicks, metrics.impressions)} CTR</p></td>
                  <td className="pr-4 pt-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(status)}`}>{statusLabel(status)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!campaigns.length && <p className="p-8 text-center text-sm text-gray-500">No {selectedStatus === "ALL" ? "Premium Listing campaigns" : statusLabel(selectedStatus).toLowerCase() + " campaigns"} yet.</p>}
      </div>
    </section>
  );
}
