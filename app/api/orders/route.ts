import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const itemSelect = {
  id: true, quantity: true, price: true,
  product: { select: {
    id: true, name: true, images: true, vendorId: true,
    vendor: { select: { id: true, businessName: true } },
  } },
} as const;
const orderSelect = {
  id: true, orderNumber: true, status: true, totalAmount: true,
  shippingAddress: true, trackingReference: true, createdAt: true, updatedAt: true,
  items: { select: itemSelect },
  payment: { select: { provider: true, status: true, verifiedAt: true } },
} as const;

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let orders;

    if (sessionUser.role === "ADMIN") {
      orders = await prisma.order.findMany({
        select: {
          ...orderSelect,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (sessionUser.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: sessionUser.id },
        select: { id: true },
      });

      if (!vendor) {
        return NextResponse.json([]);
      }

      orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              product: { vendorId: vendor.id },
            },
          },
        },
        select: {
          ...orderSelect,
          user: { select: { name: true, email: true, phone: true } },
          items: {
            where: { product: { vendorId: vendor.id } },
            select: itemSelect,
          },
        },
        orderBy: { createdAt: "desc" },
      });
      // A vendor sees its own merchandise subtotal, never the other shops' total.
      orders = orders.map((order) => ({ ...order, totalAmount: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) }));
    } else {
      // Customer or Recruiter
      orders = await prisma.order.findMany({
        where: { userId: sessionUser.id },
        select: orderSelect,
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Orders GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
