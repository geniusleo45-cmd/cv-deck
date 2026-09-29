import { type AdCampaign } from "@prisma/client";
import { premiumPackages, type PremiumPackage } from "@/lib/premiumListings";
import { prisma } from "@/lib/prisma";

type CampaignReadyForActivation = Pick<AdCampaign, "id" | "package" | "productId"> & {
  vendor: { userId: string };
  product: { name: string };
};

type CampaignPaymentProvider = "PAYSTACK" | "FLUTTERWAVE";

/**
 * Turns a provider-verified, pending campaign into a live Premium Listing.
 * updateMany makes duplicate provider webhooks harmless and lets the
 * notification be created only by the request that won the activation race.
 */
export async function activateVerifiedPremiumListing(
  campaign: CampaignReadyForActivation,
  provider: CampaignPaymentProvider,
  reference: string
) {
  const packageDetails = premiumPackages[campaign.package as PremiumPackage];
  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + packageDetails.durationDays);

  return prisma.$transaction(async (tx) => {
    const eligibleProduct = await tx.product.findFirst({
      where: {
        id: campaign.productId,
        status: "ACTIVE",
        stock: { gt: 0 },
        vendor: { status: "VERIFIED" },
      },
      select: { id: true },
    });
    if (!eligibleProduct) return false;

    const updated = await tx.adCampaign.updateMany({
      where: {
        id: campaign.id,
        status: "PENDING_PAYMENT",
        paymentProvider: provider,
        paymentReference: reference,
      },
      data: { status: "ACTIVE", startsAt, endsAt, authorizationUrl: null },
    });

    if (!updated.count) return false;

    await tx.notification.create({
      data: {
        userId: campaign.vendor.userId,
        type: "SYSTEM",
        title: "Premium Listing is live",
        message: `${campaign.product.name} is now featured for ${packageDetails.label.toLowerCase()} visibility until ${endsAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
        link: "/dashboard/vendor/advertise",
      },
    });

    return true;
  });
}
