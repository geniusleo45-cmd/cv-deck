import { Prisma, type AdCampaign } from "@prisma/client";
import { premiumPackages, type PremiumPackage } from "@/lib/premiumListings";
import { prisma } from "@/lib/prisma";

type CampaignReadyForActivation = Pick<AdCampaign, "id" | "package" | "productId"> & {
  vendor: { userId: string };
  product: { name: string };
};

type CampaignPaymentProvider = "PAYSTACK" | "FLUTTERWAVE";
export type PremiumListingActivationResult = "activated" | "already-processed" | "ineligible" | "product-already-promoted" | "cancelled-payment";

/**
 * Turns a provider-verified, pending campaign into a live Premium Listing.
 * updateMany makes duplicate provider webhooks harmless and lets the
 * notification be created only by the request that won the activation race.
 */
export async function activateVerifiedPremiumListing(
  campaign: CampaignReadyForActivation,
  provider: CampaignPaymentProvider,
  reference: string
): Promise<PremiumListingActivationResult> {
  const packageDetails = premiumPackages[campaign.package as PremiumPackage];
  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + packageDetails.durationDays);

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the campaign before checking status so cancellation and activation
      // cannot both win. The reference is never discarded.
      const claimed = await tx.adCampaign.updateMany({
        where: { id: campaign.id, status: { in: ["PENDING_PAYMENT", "CANCELLED"] }, paymentProvider: provider, paymentReference: reference },
        data: { authorizationUrl: null },
      });
      if (!claimed.count) return "already-processed";
      const current = await tx.adCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
      if (current.status === "CANCELLED") {
        const existing = await tx.adCampaignSupportRequest.findUnique({ where: { campaignId: campaign.id } });
        // This system reason survives admin resolution and deduplicates callbacks.
        if (existing?.reason !== "CANCELLED_PAYMENT_CONFIRMED") {
          const details = `Provider verified payment ${reference} for this cancelled listing. Do not activate it. Admin must review any refund manually. No automatic refund was issued.`;
          await tx.adCampaignSupportRequest.upsert({
            where: { campaignId: campaign.id },
            create: { campaignId: campaign.id, userId: campaign.vendor.userId, reason: "CANCELLED_PAYMENT_CONFIRMED", details },
            update: { reason: "CANCELLED_PAYMENT_CONFIRMED", status: "OPEN", details: existing ? `${existing.details}\n\n${details}` : details },
          });
          const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
          await tx.notification.createMany({ data: [
            { userId: campaign.vendor.userId, type: "SYSTEM", title: "Payment received for cancelled listing", message: "Your listing remains cancelled. Admin has been notified to review the payment; no automatic refund has been issued.", link: `/dashboard/vendor/advertise/${campaign.id}/support` },
            ...admins.map((admin) => ({ userId: admin.id, type: "SYSTEM" as const, title: "Cancelled listing payment requires review", message: `Verified ${provider} payment ${reference}. The listing remains cancelled; review the payment manually.`, link: "/dashboard/admin/advertising/payment-support" })),
          ] });
        }
        return "cancelled-payment";
      }
      const eligibleProduct = await tx.product.findFirst({
        where: {
          id: campaign.productId,
          status: "ACTIVE",
          stock: { gt: 0 },
          vendor: { status: "VERIFIED" },
        },
        select: { id: true },
      });
      if (!eligibleProduct) return "ineligible";

      await tx.adCampaign.updateMany({
        where: { productId: campaign.productId, status: "ACTIVE", endsAt: { lte: startsAt } },
        data: { status: "EXPIRED", authorizationUrl: null },
      });
      const existingActive = await tx.adCampaign.findFirst({
        where: { productId: campaign.productId, status: "ACTIVE", endsAt: { gt: startsAt } },
        select: { id: true },
      });
      if (existingActive) return "product-already-promoted";

      const updated = await tx.adCampaign.updateMany({
        where: {
          id: campaign.id,
          status: "PENDING_PAYMENT",
          paymentProvider: provider,
          paymentReference: reference,
        },
        data: { status: "ACTIVE", startsAt, endsAt, authorizationUrl: null },
      });

      if (!updated.count) return "already-processed";

      await tx.notification.create({
        data: {
          userId: campaign.vendor.userId,
          type: "SYSTEM",
          title: "Premium Listing is live",
          message: `${campaign.product.name} is now featured for ${packageDetails.label.toLowerCase()} visibility until ${endsAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
          link: "/dashboard/vendor/advertise",
        },
      });

      return "activated";
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "product-already-promoted";
    }
    throw error;
  }
}
