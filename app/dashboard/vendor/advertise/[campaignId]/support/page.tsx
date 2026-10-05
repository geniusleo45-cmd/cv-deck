import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PremiumListingPaymentSupportButton } from "../../PremiumListingPaymentSupportButton";

export default async function CampaignSupportPage({ params }: {
  params: Promise<{ campaignId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") notFound();
  const { campaignId } = await params;
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, vendor: { userId: user.id } },
    select: {
      id: true, status: true, package: true, amount: true,
      paymentProvider: true, paymentReference: true,
      product: { select: { name: true } },
      supportRequest: { select: {
        status: true, reason: true, details: true, adminNote: true,
        createdAt: true, updatedAt: true,
      } },
    },
  });
  if (!campaign) notFound();
  const support = campaign.supportRequest;
  const canCreate = campaign.status === "PENDING_PAYMENT"
    && Boolean(campaign.paymentProvider && campaign.paymentReference);
  const formatDate = (date: Date) => date.toLocaleString("en-NG", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos",
  });

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/vendor/advertise" className="text-sm font-bold text-blue-600">← Back to Premium Listings</Link>
      <header><h1 className="text-2xl font-black">Premium Listing payment support</h1><p className="mt-2 text-sm text-gray-500">{campaign.product.name}</p></header>
      <div className="space-y-3 rounded-2xl border bg-white p-5 dark:bg-gray-900">
        <p className="font-bold">{campaign.package.toLowerCase()} placement · ₦{campaign.amount.toLocaleString("en-NG")}</p>
        <p className="text-sm">Campaign: {campaign.status.replaceAll("_", " ")}</p>
        <p className="break-all text-sm text-gray-500">{campaign.paymentProvider || "Payment provider not selected"} · {campaign.paymentReference || "No payment reference yet"}</p>
      </div>
      {support && <div className="space-y-3 rounded-2xl border p-5">
        <h2 className="font-bold">Your request</h2>
        <p className="text-sm text-gray-500">{support.reason.replaceAll("_", " ")}</p>
        <p className="whitespace-pre-wrap break-words text-sm">{support.details}</p>
        <p className="text-xs text-gray-500">Submitted {formatDate(support.createdAt)} (Lagos time)</p>
      </div>}
      <PremiumListingPaymentSupportButton
        campaignId={campaign.id}
        canCreate={canCreate}
        initialSupportRequest={support ? {
          status: support.status, adminNote: support.adminNote,
          createdAt: support.createdAt.toISOString(), updatedAt: support.updatedAt.toISOString(),
        } : null}
      />
      {!support && !canCreate && <p className="rounded-xl border p-4 text-sm text-gray-500">There is no pending payment to review for this campaign.</p>}
    </section>
  );
}
