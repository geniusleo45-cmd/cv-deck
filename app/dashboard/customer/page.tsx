import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, Store, Clock, ArrowRight, Truck } from "lucide-react";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();

  const [orders, totalOrders, activeDeliveries, notificationsCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user?.id },
      include: {
        items: { include: { product: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.count({
      where: { userId: user?.id },
    }),
    prisma.order.count({
      where: {
        userId: user?.id,
        status: { in: ["PROCESSING", "SHIPPED"] },
      },
    }),
    prisma.notification.count({
      where: { userId: user?.id, read: false },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            Customer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome back, {user?.name || "Shopper"}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
            Track your Computer Village orders, manage saved gadgets, and communicate directly with verified hardware vendors.
          </p>
        </div>
        <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold shrink-0 shadow-md gap-2" asChild>
          <Link href="/dashboard/marketplace">
            <Store className="h-5 w-5" /> Explore Marketplace
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Unread Notifications</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{notificationsCount}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Active Deliveries</span>
            <Truck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{activeDeliveries}</p>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" /> Recent Purchases
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/orders" className="text-xs text-blue-600 font-bold gap-1">
              View All Orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-10 space-y-3 border-2 border-dashed rounded-xl">
            <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-500">You haven&apos;t placed any orders yet.</p>
            <Button size="sm" className="bg-blue-600 text-white font-semibold" asChild>
              <Link href="/dashboard/marketplace">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => (
              <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">#{order.orderNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        order.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.status === "SHIPPED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.items.length} item(s) • Total: <span className="font-bold text-gray-900 dark:text-white">₦{order.totalAmount.toLocaleString()}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/orders`}>Order Details</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
