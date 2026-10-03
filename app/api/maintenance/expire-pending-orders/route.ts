import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const expiryMs = 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - expiryMs) } },
    include: { payment: true, items: true },
  });

  let expired = 0;
  for (const order of orders) {
    if (order.payment?.status === "SUCCESS") continue;
    const released = await prisma.$transaction(async (tx) => {
      const update = await tx.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
      if (update.count !== 1) return false;
      await Promise.all(order.items.map((item) => tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })));
      await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "FAILED", authorizationUrl: null } });
      await tx.notification.create({ data: { userId: order.userId, type: "ORDER_STATUS", title: "Unpaid order expired", message: `Order #${order.orderNumber} expired after one hour and its reserved stock was released.`, link: "/dashboard/orders" } });
      return true;
    });
    if (released) expired += 1;
  }

  const now = new Date();
  const expiredCampaigns = await prisma.adCampaign.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    orderBy: { endsAt: "asc" },
    take: 100,
    select: {
      id: true,
      product: { select: { name: true } },
      vendor: { select: { userId: true } },
    },
  });

  let expiredPremiumListings = 0;
  for (const campaign of expiredCampaigns) {
    const expiredCampaign = await prisma.$transaction(async (tx) => {
      const update = await tx.adCampaign.updateMany({
        where: { id: campaign.id, status: "ACTIVE", endsAt: { lte: now } },
        data: { status: "EXPIRED", authorizationUrl: null },
      });
      if (update.count !== 1) return false;

      await tx.notification.create({
        data: {
          userId: campaign.vendor.userId,
          type: "SYSTEM",
          title: "Premium Listing ended",
          message: `${campaign.product.name} is no longer featured. Renew it to continue reaching marketplace shoppers.`,
          link: `/dashboard/vendor/advertise?renew=${encodeURIComponent(campaign.id)}`,
        },
      });
      return true;
    });
    if (expiredCampaign) expiredPremiumListings += 1;
  }

  return NextResponse.json({ expired, expiredPremiumListings });
}
