import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PremiumListingForm } from "./PremiumListingForm";

function campaignStatusLabel(status: string, endsAt: Date | null, now: Date) {
  if (status === "ACTIVE" && endsAt && endsAt <= now) return "EXPIRED";
  return status;
}

export default async function AdvertisePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const user = await getCurrentUser();
  const { campaign: campaignId } = await searchParams;
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

  const resumeCampaign = vendor?.adCampaigns.find((campaign) => (
    campaign.id === campaignId
    && campaign.status === "PENDING_PAYMENT"
    && vendor.products.some((product) => product.id === campaign.productId)
  ));

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
            <section className="space-y-3 rounded-2xl border bg-white p-5 dark:bg-gray-900">
              <div>
                <h2 className="font-black text-gray-900 dark:text-white">Your Premium Listings</h2>
                <p className="mt-1 text-sm text-gray-500">Resume a secure checkout or review when an active placement ends.</p>
              </div>
              <div className="space-y-3">
                {vendor.adCampaigns.map((campaign) => {
                  const status = campaignStatusLabel(campaign.status, campaign.endsAt, now);
                  const providerName = campaign.paymentProvider === "PAYSTACK" ? "Paystack" : campaign.paymentProvider === "FLUTTERWAVE" ? "Flutterwave" : null;
                  const statusClass = status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : status === "PENDING_PAYMENT" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                  return <article key={campaign.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold text-gray-900 dark:text-white">{campaign.product.name}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>{status.replace("_", " ")}</span></div><p className="mt-1 text-xs text-gray-500">{campaign.package.toLowerCase()} placement · ₦{campaign.amount.toLocaleString()} {status === "ACTIVE" && campaign.endsAt ? `· ends ${campaign.endsAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}` : ""}</p></div>{status === "PENDING_PAYMENT" && (campaign.authorizationUrl ? <a href={campaign.authorizationUrl} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Resume {providerName || "payment"}</a> : <Link href={`/dashboard/vendor/advertise?campaign=${encodeURIComponent(campaign.id)}`} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Choose payment</Link>)}</article>;
                })}
              </div>
            </section>
          )}

          {!vendor.products.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-sm text-gray-500">Add an active, in-stock product before creating a Premium Listing.</div>
          ) : (
            <PremiumListingForm key={resumeCampaign?.id || "new"} products={vendor.products} resumeCampaign={resumeCampaign ? { id: resumeCampaign.id, productId: resumeCampaign.productId, package: resumeCampaign.package, paymentProvider: resumeCampaign.paymentProvider } : undefined} />
          )}
        </>
      )}
    </section>
  );
}
