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

  const expiredPremiumListings = await prisma.adCampaign.updateMany({
    where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    data: { status: "EXPIRED", authorizationUrl: null },
  });

  return NextResponse.json({ expired, expiredPremiumListings: expiredPremiumListings.count });
}
