import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, CreditCard, Megaphone, MousePointerClick, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { premiumPackages, type PremiumPackage } from "@/lib/premiumListings";
import { PrintPremiumReceiptButton } from "./PrintPremiumReceiptButton";

function providerLabel(provider: string | null) {
  if (provider === "PAYSTACK") return "Paystack";
  if (provider === "FLUTTERWAVE") return "Flutterwave";
  return "Verified payment";
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default async function PremiumListingReceiptPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") notFound();

  const campaign = await prisma.adCampaign.findFirst({
    where: {
      id: campaignId,
      vendor: { userId: user.id },
      status: { in: ["ACTIVE", "EXPIRED"] },
    },
    include: {
      product: { select: { id: true, name: true } },
      vendor: {
        select: {
          businessName: true,
          officeAddress: true,
          phone: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!campaign) notFound();

  const eventCounts = await prisma.adCampaignEvent.groupBy({
    by: ["type"],
    where: { campaignId: campaign.id },
    _count: { id: true },
  });
  const impressions = eventCounts.find((event) => event.type === "IMPRESSION")?._count.id || 0;
  const clicks = eventCounts.find((event) => event.type === "CLICK")?._count.id || 0;
  const cartAdds = eventCounts.find((event) => event.type === "ADD_TO_CART")?._count.id || 0;
  const packageDetails = premiumPackages[campaign.package as PremiumPackage];
  const campaignCode = campaign.id.slice(-8).toUpperCase();
  const statusLabel = campaign.status === "ACTIVE" ? "Live and paid" : "Completed and paid";

  return (
    <section className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/vendor/advertise" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600"><ArrowLeft className="h-4 w-4" /> Back to Premium Listings</Link>
        <PrintPremiumReceiptButton />
      </div>

      <article className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900 sm:p-8">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">CV Deck advertising receipt</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black"><Megaphone className="h-6 w-6 text-amber-500" /> Campaign #{campaignCode}</h1>
            <p className="mt-1 text-sm text-gray-500">Issued {formatDate(campaign.createdAt)}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-gray-500">Amount paid</p>
            <p className="text-2xl font-black text-blue-600">₦{campaign.amount.toLocaleString()}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> {statusLabel}</p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500"><Megaphone className="h-4 w-4" /> Campaign</p>
            <p className="font-bold">{campaign.product.name}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{packageDetails.label} Premium Listing · {packageDetails.durationDays} {packageDetails.durationDays === 1 ? "day" : "days"}</p>
            <p className="mt-3 text-xs text-gray-500">Merchant: {campaign.vendor.businessName}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500"><CreditCard className="h-4 w-4" /> Payment</p>
            <p className="font-semibold">{providerLabel(campaign.paymentProvider)} · Verified</p>
            <p className="mt-1 break-all text-xs text-gray-500">Reference: {campaign.paymentReference || "Payment reference retained securely"}</p>
            <p className="mt-3 text-xs text-gray-500">{campaign.vendor.user.name || campaign.vendor.user.email}</p>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-blue-600" /> Featured placement window</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Started</p><p className="mt-1 font-semibold">{formatDate(campaign.startsAt)}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Ends / ended</p><p className="mt-1 font-semibold">{formatDate(campaign.endsAt)}</p></div></div>
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4 text-blue-600" /> Campaign performance</p>
          <div className="grid gap-3 sm:grid-cols-4"><div><p className="text-2xl font-black">{impressions.toLocaleString()}</p><p className="text-xs text-gray-500">Unique daily impressions</p></div><div><p className="text-2xl font-black">{clicks.toLocaleString()}</p><p className="text-xs text-gray-500">Product detail clicks</p></div><div><p className="flex items-center gap-1 text-2xl font-black"><ShoppingBag className="h-5 w-5 text-violet-600" /> {cartAdds.toLocaleString()}</p><p className="text-xs text-gray-500">Sponsored card cart adds</p></div><div><p className="flex items-center gap-1 text-2xl font-black"><MousePointerClick className="h-5 w-5 text-emerald-600" /> {impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—"}</p><p className="text-xs text-gray-500">Click-through rate</p></div></div>
          <p className="mt-4 text-xs text-gray-500">Performance records one impression, detail click, and sponsored-card cart add per browser each day for this campaign.</p>
        </div>

        <footer className="border-t pt-5 text-xs text-gray-500">CV Deck Marketplace · {campaign.vendor.businessName}{campaign.vendor.officeAddress ? ` · ${campaign.vendor.officeAddress}` : ""}{campaign.vendor.phone ? ` · ${campaign.vendor.phone}` : ""}</footer>
      </article>
    </section>
  );
}
