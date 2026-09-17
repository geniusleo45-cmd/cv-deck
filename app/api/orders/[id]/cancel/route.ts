import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { payment: true, items: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING" || order.payment?.status === "SUCCESS") {
    return NextResponse.json({ error: "Only unpaid pending orders can be cancelled." }, { status: 400 });
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, userId: user.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (updated.count !== 1) return false;

    await Promise.all(
      order.items.map((item) =>
        tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
      )
    );

    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "FAILED", authorizationUrl: null },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "ORDER_STATUS",
        title: "Order cancelled",
        message: `Order #${order.orderNumber} was cancelled and the reserved stock was released.`,
        link: "/dashboard/orders",
      },
    });

    return true;
  });

  if (!cancelled) {
    return NextResponse.json({ error: "This order was updated and can no longer be cancelled." }, { status: 409 });
  }

  return NextResponse.json({ message: "Order cancelled" });
}
