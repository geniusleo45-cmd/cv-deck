import { Prisma, type AdCampaign } from "@prisma/client";
import { premiumPackages, type PremiumPackage } from "@/lib/premiumListings";
import { prisma } from "@/lib/prisma";

type CampaignReadyForActivation = Pick<AdCampaign, "id" | "package" | "productId"> & {
  vendor: { userId: string };
  product: { name: string };
};

type CampaignPaymentProvider = "PAYSTACK" | "FLUTTERWAVE";
export type PremiumListingActivationResult = "activated" | "already-processed" | "ineligible" | "product-already-promoted";

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
