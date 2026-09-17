import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Package, ShoppingBag, DollarSign, PlusCircle, AlertTriangle } from "lucide-react";
import { FulfillmentActions } from "@/components/vendor/FulfillmentActions";

export default async function VendorDashboardPage() {
  const user = await getCurrentUser();

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user?.id },
    include: {
      products: { include: { category: true } },
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const orders = vendor
    ? await prisma.order.findMany({
        where: {
          items: {
            some: { product: { vendorId: vendor.id } },
          },
        },
        include: {
          user: { select: { name: true, email: true } },
          items: {
            where: { product: { vendorId: vendor.id } },
            include: { product: true },
          },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const totalRevenue = orders.reduce((sum, order) => {
    const vendorItemsTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    return sum + vendorItemsTotal;
  }, 0);

  const verificationStatus = vendor?.status || "PENDING";
  const latestVerification = vendor?.verifications[0];

  return (
    <div className="space-y-6">
      {/* Vendor Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-0.5 text-xs font-bold uppercase">
              Vendor Control Panel
            </span>
            {verificationStatus === "VERIFIED" ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified Shop
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 text-xs font-bold">
                <AlertTriangle className="h-3.5 w-3.5" /> Verification Pending
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {vendor?.businessName || "Your Computer Village Shop"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            {vendor?.officeAddress || "Computer Village, Ikeja, Lagos"}
          </p>
        </div>

        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 shadow-md gap-2" asChild>
          <Link href="/dashboard/vendor?action=add-product">
            <PlusCircle className="h-5 w-5" /> Add New Inventory
          </Link>
        </Button>
      </div>

      {/* Verification Warning Alert if Pending */}
      {verificationStatus !== "VERIFIED" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Vendor Verification Required</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Submit your CAC registration or Govt ID document for physical store verification by Computer Village admins to get the Verified Vendor badge.
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0" asChild>
            <Link href="/dashboard/vendor?tab=verification">Submit Verification Docs</Link>
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Sales Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₦{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Active Products</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendor?.products.length || 0}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Orders Received</span>
            <ShoppingBag className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Store Rating</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendor?.rating || "4.8"} ★</p>
        </div>
      </div>

      {/* Paid orders ready for fulfillment */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Fulfillment queue</h2><p className="mt-1 text-xs text-gray-500">Update paid orders as you dispatch and complete delivery.</p></div>
        {orders.filter((order) => (order.status === "PROCESSING" || order.status === "SHIPPED") && order.payment?.status === "SUCCESS").length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800">No paid orders are waiting for fulfillment.</p> : <div className="space-y-3">{orders.filter((order) => (order.status === "PROCESSING" || order.status === "SHIPPED") && order.payment?.status === "SUCCESS").map((order) => <div key={order.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-sm text-gray-900 dark:text-white">Order #{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">{order.user.name || order.user.email} · {order.items.length} item{order.items.length === 1 ? "" : "s"} · ₦{order.items.reduce((sum, item) => sum + item.quantity * item.price, 0).toLocaleString()}</p></div><FulfillmentActions orderId={order.id} status={order.status as "PROCESSING" | "SHIPPED"} /></div>)}</div>}
      </div>

      {/* Inventory Management Table */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" /> Inventory & Stock Manager
          </h2>
        </div>

        {!vendor?.products || vendor.products.length === 0 ? (
          <div className="text-center py-10 space-y-3 border-2 border-dashed rounded-xl">
            <Package className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-500">You haven&apos;t listed any products yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800 uppercase text-[11px] font-bold text-gray-500">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Condition</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vendor.products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{prod.name}</td>
                    <td className="p-3">{prod.category?.name || "General"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                        {prod.condition}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-blue-600">₦{prod.price.toLocaleString()}</td>
                    <td className="p-3 font-semibold">{prod.stock} units</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          prod.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
