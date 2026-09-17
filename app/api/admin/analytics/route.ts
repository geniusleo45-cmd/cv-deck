import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const [
      totalUsers,
      totalVendors,
      verifiedVendors,
      pendingVerifications,
      totalProducts,
      totalOrders,
      successfulPayments,
      roleCounts,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: "VERIFIED" } }),
      prisma.vendorVerification.count({ where: { status: "PENDING" } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    const totalRevenue = successfulPayments._sum.amount || 0;

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalVendors,
        verifiedVendors,
        pendingVerifications,
        totalProducts,
        totalOrders,
        totalRevenue,
      },
      roleBreakdown: roleCounts.reduce((acc: any, curr) => {
        acc[curr.role] = curr._count.role;
        return acc;
      }, {}),
      recentOrders,
    });
  } catch (error) {
    console.error("Admin Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
