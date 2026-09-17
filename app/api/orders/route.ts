import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let orders;

    if (sessionUser.role === "ADMIN") {
      orders = await prisma.order.findMany({
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: true } },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (sessionUser.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: sessionUser.id },
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
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: {
            where: { product: { vendorId: vendor.id } },
            include: { product: true },
          },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Customer or Recruiter
      orders = await prisma.order.findMany({
        where: { userId: sessionUser.id },
        include: {
          items: { include: { product: { include: { vendor: true } } } },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Orders GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
