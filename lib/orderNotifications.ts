import { prisma } from "@/lib/prisma";

export async function notifyVendorsOfPaidOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        items: { select: { quantity: true, product: { select: { vendor: { select: { userId: true } } } } } },
      },
    });
    if (!order) return;

    const itemsByVendor = new Map<string, number>();
    for (const item of order.items) {
      const vendorUserId = item.product.vendor.userId;
      itemsByVendor.set(vendorUserId, (itemsByVendor.get(vendorUserId) || 0) + item.quantity);
    }

    if (itemsByVendor.size) {
      await prisma.notification.createMany({
        data: [...itemsByVendor.entries()].map(([userId, quantity]) => ({
          userId,
          type: "ORDER_STATUS" as const,
          title: "New paid order ready for fulfillment",
          message: `Order #${order.orderNumber} has been paid and includes ${quantity} item${quantity === 1 ? "" : "s"} from your shop.`,
          link: "/dashboard/vendor",
        })),
      });
    }
  } catch (error) {
    console.error("Unable to notify vendors about paid order:", error);
  }
}
