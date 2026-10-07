import { prisma } from "@/lib/prisma";

export type VerifiedPaymentFinalization = "processed" | "already-processed" | "cancelled" | "missing";

/**
 * Finalizes a provider-verified customer payment and all related vendor
 * notifications together. The conditional payment update makes a callback
 * and a provider webhook safe to process concurrently.
 */
export async function completeVerifiedOrderPayment(paymentId: string): Promise<VerifiedPaymentFinalization> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        orderId: true,
        order: {
          select: {
            status: true,
            orderNumber: true,
            userId: true,
            items: {
              select: {
                quantity: true,
                adCampaignId: true,
                attributedQuantity: true,
                product: { select: { vendor: { select: { userId: true } } } },
                adCampaign: {
                  select: {
                    product: { select: { name: true } },
                    vendor: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) return "missing";
    async function recordCancelledPayment(): Promise<VerifiedPaymentFinalization> {
      if (!payment) return "missing";
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "SUCCESS" } },
        data: { status: "SUCCESS", verifiedAt: new Date(), authorizationUrl: null },
      });
      if (claimed.count) {
        const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
        await tx.notification.createMany({ data: [
          { userId: payment.order.userId, type: "SYSTEM", title: "Payment received — needs review", message: `Payment for cancelled order #${payment.order.orderNumber} was confirmed. Your order remains cancelled. Please contact support for manual payment review; no refund has been issued automatically.`, link: "/dashboard/orders" },
          ...admins.map((admin) => ({ userId: admin.id, type: "SYSTEM" as const, title: "Cancelled order payment needs review", message: `Payment for cancelled order #${payment.order.orderNumber} was verified. Review it with the payment provider; do not fulfill the cancelled order.`, link: "/dashboard/admin/payment-review" })),
        ] });
      }
      return "cancelled";
    }
    if (payment.order.status === "CANCELLED") return recordCancelledPayment();
    if (payment.status === "SUCCESS") return "already-processed";

    // Claim the same order row that cancellation and expiry claim, before
    // touching payment rows. Only one transition out of PENDING can win.
    const orderClaimed = await tx.order.updateMany({
      where: { id: payment.orderId, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (!orderClaimed.count) {
      const latest = await tx.order.findUnique({
        where: { id: payment.orderId },
        select: { status: true, payment: { select: { status: true } } },
      });
      if (!latest) return "missing";
      if (latest.status === "CANCELLED") return recordCancelledPayment();
      if (latest.payment?.status === "SUCCESS") return "already-processed";
      throw new Error("Order is not pending and its payment is not finalized.");
    }

    const verifiedAt = new Date();
    const paymentClaimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: { status: "SUCCESS", verifiedAt },
    });
    if (!paymentClaimed.count) return "already-processed";

    const itemsByVendor = new Map<string, number>();
    for (const item of payment.order.items) {
      const vendorUserId = item.product.vendor.userId;
      itemsByVendor.set(vendorUserId, (itemsByVendor.get(vendorUserId) || 0) + item.quantity);
    }
    if (itemsByVendor.size) {
      await tx.notification.createMany({
        data: [...itemsByVendor.entries()].map(([userId, quantity]) => ({
          userId,
          type: "ORDER_STATUS" as const,
          title: "New paid order ready for fulfillment",
          message: `Order #${payment.order.orderNumber} has been paid and includes ${quantity} item${quantity === 1 ? "" : "s"} from your shop.`,
          link: "/dashboard/vendor",
        })),
      });
    }

    const conversions = new Map<string, { userId: string; productName: string; quantity: number }>();
    for (const item of payment.order.items) {
      if (!item.adCampaignId || !item.adCampaign || item.attributedQuantity <= 0) continue;
      const current = conversions.get(item.adCampaignId);
      conversions.set(item.adCampaignId, {
        userId: item.adCampaign.vendor.userId,
        productName: item.adCampaign.product.name,
        quantity: (current?.quantity || 0) + item.attributedQuantity,
      });
    }

    for (const [campaignId, conversion] of conversions) {
      const campaignClaimed = await tx.adCampaign.updateMany({
        where: { id: campaignId, firstAttributedSaleNotifiedAt: null },
        data: { firstAttributedSaleNotifiedAt: verifiedAt },
      });
      if (!campaignClaimed.count) continue;

      await tx.notification.create({
        data: {
          userId: conversion.userId,
          type: "SYSTEM",
          title: "Your Premium Listing made its first paid sale",
          message: `“${conversion.productName}” generated ${conversion.quantity} verified paid unit${conversion.quantity === 1 ? "" : "s"} from its Premium Listing in order #${payment.order.orderNumber}.`,
          link: `/dashboard/vendor/advertise/${campaignId}/report`,
        },
      });
    }

    return "processed";
  });
}
