import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminVendorReviewQueue } from "./AdminVendorReviewQueue";
import {
  ShieldCheck,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Flag,
  EyeOff,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  const [
    users,
    vendors,
    verifications,
    productsCount,
    orders,
    paymentsSum,
    pendingReports,
    hiddenProducts,
    pausedVendors,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.vendor.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
        verifications: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorVerification.findMany({
      where: { status: "PENDING" },
      include: {
        vendor: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count(),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "INACTIVE" } }),
    prisma.vendor.count({ where: { status: "REJECTED" } }),
  ]);

  const totalRevenue = paymentsSum._sum.amount || 0;

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-block rounded-full bg-red-500/20 text-red-300 border border-red-400/30 px-3 py-1 text-xs font-bold uppercase">
            Platform Master Admin
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">
            Executive Control Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Monitor Computer Village marketplace transactions, verify vendor physical stores, review order flows, and analyze system metrics.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/admin/reports?status=PENDING" className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-red-900/60 dark:bg-red-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-red-800 dark:text-red-300"><span>Pending marketplace reports</span><Flag className="h-4 w-4" /></div>
          <p className="mt-2 text-3xl font-black text-red-900 dark:text-red-100">{pendingReports}</p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">Open moderation queue →</p>
        </Link>
        <Link href="/dashboard/admin/reports" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300"><span>Hidden product listings</span><EyeOff className="h-4 w-4" /></div>
          <p className="mt-2 text-3xl font-black text-amber-900 dark:text-amber-100">{hiddenProducts}</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Review and restore if needed →</p>
        </Link>
        <Link href="/dashboard/admin/reports" className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-purple-900/60 dark:bg-purple-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800 dark:text-purple-300"><span>Paused vendor shops</span><ShieldCheck className="h-4 w-4" /></div>
          <p className="mt-2 text-3xl font-black text-purple-900 dark:text-purple-100">{pausedVendors}</p>
          <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">Open shop moderation →</p>
        </Link>
      </section>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₦{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Pending Verifications</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{verifications.length}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Registered Vendors</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendors.length}</p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Marketplace Users</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
        </div>
      </div>

      {/* Vendor Verification Interactive Review Queue */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" /> Vendor Verification Approval Queue
            </h2>
            <p className="text-xs text-gray-500">
              Review submitted CAC documents and physical store addresses to grant Verified status.
            </p>
          </div>
          <span className="rounded-full bg-purple-100 dark:bg-purple-950 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300">
            {verifications.length} Pending Approval
          </span>
        </div>

        <AdminVendorReviewQueue verifications={verifications} />
      </div>

      {/* Global Recent Orders Table */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-blue-600" /> Global Platform Orders
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 uppercase text-[11px] font-bold text-gray-500">
              <tr>
                <th className="p-3">Order Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-gray-900 dark:text-white">#{o.orderNumber}</td>
                  <td className="p-3 font-medium">{o.user.name} ({o.user.email})</td>
                  <td className="p-3 font-bold text-blue-600">₦{o.totalAmount.toLocaleString()}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
