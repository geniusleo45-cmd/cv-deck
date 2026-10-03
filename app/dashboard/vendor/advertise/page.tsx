import Link from "next/link";
import { BarChart3, Megaphone, MousePointerClick, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PremiumListingForm } from "./PremiumListingForm";

type CampaignMetrics = { impressions: number; clicks: number };

function campaignStatusLabel(status: string, endsAt: Date | null, now: Date) {
  if (status === "ACTIVE" && endsAt && endsAt <= now) return "EXPIRED";
  return status;
}

function percentage(clicks: number, impressions: number) {
  return impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—";
}

export default async function AdvertisePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; renew?: string }>;
}) {
  const user = await getCurrentUser();
  const { campaign: campaignId, renew: renewalCampaignId } = await searchParams;
  const now = new Date();
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user?.id },
    include: {
      products: {
        where: { status: "ACTIVE", stock: { gt: 0 } },
        select: { id: true, name: true, price: true },
        orderBy: { createdAt: "desc" },
      },
      adCampaigns: {
        take: 12,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  const campaignIds = vendor?.adCampaigns.map((campaign) => campaign.id) || [];
  const eventCounts = campaignIds.length
    ? await prisma.adCampaignEvent.groupBy({
      by: ["campaignId", "type"],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    })
    : [];
  const metricsByCampaign = new Map<string, CampaignMetrics>();
  for (const count of eventCounts) {
    const metrics = metricsByCampaign.get(count.campaignId) || { impressions: 0, clicks: 0 };
    if (count.type === "IMPRESSION") metrics.impressions = count._count.id;
    if (count.type === "CLICK") metrics.clicks = count._count.id;
    metricsByCampaign.set(count.campaignId, metrics);
  }

  const requestedCampaignId = campaignId || renewalCampaignId;
  const requestedCampaign = requestedCampaignId && vendor
    ? await prisma.adCampaign.findFirst({
      where: { id: requestedCampaignId, vendorId: vendor.id },
      select: { id: true, productId: true, package: true, status: true, paymentProvider: true, endsAt: true, product: { select: { id: true, name: true } } },
    })
    : null;
  const resumeCampaign = requestedCampaign && requestedCampaign.id === campaignId && (
    requestedCampaign.status === "PENDING_PAYMENT"
    && vendor?.products.some((product) => product.id === requestedCampaign.productId)
  ) ? requestedCampaign : undefined;
  const renewalCampaign = requestedCampaign && requestedCampaign.id === renewalCampaignId && (
    campaignStatusLabel(requestedCampaign.status, requestedCampaign.endsAt, now) === "EXPIRED"
    && vendor?.products.some((product) => product.id === requestedCampaign.productId)
  ) ? requestedCampaign : undefined;
  const activeCampaigns = vendor?.adCampaigns.filter((campaign) => campaignStatusLabel(campaign.status, campaign.endsAt, now) === "ACTIVE") || [];
  const totalImpressions = [...metricsByCampaign.values()].reduce((sum, metrics) => sum + metrics.impressions, 0);
  const totalClicks = [...metricsByCampaign.values()].reduce((sum, metrics) => sum + metrics.clicks, 0);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><Megaphone className="h-6 w-6 text-blue-600" /> Premium Listings</h1>
        <p className="mt-1 text-sm text-gray-500">Promote an active product in featured CV Deck marketplace placements. Paid listings are clearly marked as sponsored.</p>
      </div>

      {vendor?.status !== "VERIFIED" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Your shop must be verified before you can purchase Premium Listings.</div>
      ) : (
        <>
          {vendor.adCampaigns.length > 0 && (
            <>
              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 dark:bg-gray-900"><Sparkles className="h-4 w-4 text-amber-500" /><p className="mt-3 text-2xl font-black">{activeCampaigns.length}</p><p className="text-xs text-gray-500">Active listings</p></div>
                <div className="rounded-2xl border bg-white p-4 dark:bg-gray-900"><BarChart3 className="h-4 w-4 text-blue-600" /><p className="mt-3 text-2xl font-black">{totalImpressions.toLocaleString()}</p><p className="text-xs text-gray-500">Unique daily impressions</p></div>
                <div className="rounded-2xl border bg-white p-4 dark:bg-gray-900"><MousePointerClick className="h-4 w-4 text-emerald-600" /><p className="mt-3 text-2xl font-black">{totalClicks.toLocaleString()}</p><p className="text-xs text-gray-500">Product detail clicks</p></div>
              </section>

              <section className="space-y-3 rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div>
                  <h2 className="font-black text-gray-900 dark:text-white">Your Premium Listings</h2>
                  <p className="mt-1 text-sm text-gray-500">One daily impression and one product-detail click per browser are counted for each campaign.</p>
                </div>
                <div className="space-y-3">
                  {vendor.adCampaigns.map((campaign) => {
                    const status = campaignStatusLabel(campaign.status, campaign.endsAt, now);
                    const providerName = campaign.paymentProvider === "PAYSTACK" ? "Paystack" : campaign.paymentProvider === "FLUTTERWAVE" ? "Flutterwave" : null;
                    const statusClass = status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : status === "PENDING_PAYMENT" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                    const metrics = metricsByCampaign.get(campaign.id) || { impressions: 0, clicks: 0 };
                    const canRenew = status === "EXPIRED" && vendor.products.some((product) => product.id === campaign.productId);
                    return <article key={campaign.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold text-gray-900 dark:text-white">{campaign.product.name}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>{status.replace("_", " ")}</span></div><p className="mt-1 text-xs text-gray-500">{campaign.package.toLowerCase()} placement · ₦{campaign.amount.toLocaleString()} {status === "ACTIVE" && campaign.endsAt ? `· ends ${campaign.endsAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}` : ""}</p>{status !== "PENDING_PAYMENT" && <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-300">{metrics.impressions.toLocaleString()} impressions · {metrics.clicks.toLocaleString()} detail clicks · {percentage(metrics.clicks, metrics.impressions)} CTR</p>}</div>{status === "PENDING_PAYMENT" && (campaign.authorizationUrl ? <a href={campaign.authorizationUrl} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Resume {providerName || "payment"}</a> : <Link href={`/dashboard/vendor/advertise?campaign=${encodeURIComponent(campaign.id)}`} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Choose payment</Link>)}{canRenew && <Link href={`/dashboard/vendor/advertise?renew=${encodeURIComponent(campaign.id)}`} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30">Renew listing</Link>}</article>;
                  })}
                </div>
              </section>
            </>
          )}

          {!vendor.products.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-sm text-gray-500">Add an active, in-stock product before creating a Premium Listing.</div>
          ) : (
            <PremiumListingForm key={resumeCampaign?.id || renewalCampaign?.id || "new"} products={vendor.products} resumeCampaign={resumeCampaign ? { id: resumeCampaign.id, productId: resumeCampaign.productId, package: resumeCampaign.package, paymentProvider: resumeCampaign.paymentProvider } : undefined} renewalCampaign={!resumeCampaign && renewalCampaign ? { id: renewalCampaign.id, productId: renewalCampaign.productId, productName: renewalCampaign.product.name, package: renewalCampaign.package } : undefined} />
          )}
        </>
      )}
    </section>
  );
}
