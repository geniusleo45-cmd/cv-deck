import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusSchema } from "@/lib/validations/order";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { product: { include: { vendor: true } } } },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.userId === sessionUser.id;
    const isAdmin = sessionUser.role === "ADMIN";
    let vendorOwnsOrder = false;

    if (sessionUser.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({ where: { userId: sessionUser.id } });
      vendorOwnsOrder = Boolean(
        vendor &&
          order.items.length > 0 &&
          order.items.every((item) => item.product.vendorId === vendor.id)
      );
    }

    if (!isOwner && !isAdmin && !vendorOwnsOrder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || (sessionUser.role !== "VENDOR" && sessionUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateOrderStatusSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: { select: { vendorId: true } } } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (sessionUser.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({ where: { userId: sessionUser.id } });
      const ownsEveryItem = vendor && order.items.length > 0 && order.items.every((item) => item.product.vendorId === vendor.id);
      if (!ownsEveryItem) return NextResponse.json({ error: "You can only fulfill orders containing your products." }, { status: 403 });
      const allowedStatus = (order.status === "PROCESSING" && validated.status === "SHIPPED") || (order.status === "SHIPPED" && validated.status === "DELIVERED");
      if (!allowedStatus) return NextResponse.json({ error: "This order cannot move to that fulfillment status." }, { status: 400 });
    }

    const generatedTrackingReference = validated.status === "SHIPPED"
      ? order.trackingReference || `CVD-${order.orderNumber.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
      : undefined;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: validated.status, trackingReference: generatedTrackingReference },
      include: { user: true },
    });

    // Notify customer about order status change
    await prisma.notification.create({
      data: {
        userId: updatedOrder.userId,
        type: "ORDER_STATUS",
        title: `Order Status Updated: ${validated.status}`,
        message: validated.status === "SHIPPED" && updatedOrder.trackingReference ? `Your order #${updatedOrder.orderNumber} has shipped. Reference: ${updatedOrder.trackingReference}` : `Your order #${updatedOrder.orderNumber} status has been updated to ${validated.status}.`,
        link: `/dashboard/orders`,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
