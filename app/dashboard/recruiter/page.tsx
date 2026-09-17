import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, Store, MessageSquare, ShieldCheck, MapPin, Search } from "lucide-react";

export default async function RecruiterDashboardPage() {
  const user = await getCurrentUser();

  const [vendors, recruiterProfile] = await Promise.all([
    prisma.vendor.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
        _count: { select: { products: true } },
      },
      orderBy: { rating: "desc" },
    }),
    prisma.recruiterProfile.findUnique({
      where: { userId: user?.id },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Recruiter Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-block rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3 py-1 text-xs font-bold uppercase">
            Recruiter & Procurement Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">
            {recruiterProfile?.companyName || "Corporate Procurement Hub"}
          </h1>
          <p className="text-xs sm:text-sm text-purple-200">
            Source bulk enterprise IT hardware, laptops, networking gear, and component technicians directly from verified Computer Village vendors.
          </p>
        </div>
        <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white font-bold shrink-0 shadow-md gap-2" asChild>
          <Link href="/dashboard/messages">
            <MessageSquare className="h-5 w-5" /> Contact Vendors Directly
          </Link>
        </Button>
      </div>

      {/* Recruiter Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Verified Computer Village Vendors</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {vendors.filter((v) => v.status === "VERIFIED").length}
          </p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Company Industry</span>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {recruiterProfile?.industry || "Information Technology"}
          </p>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Procurement Status</span>
            <Store className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">Active</p>
        </div>
      </div>

      {/* Computer Village Vendor Directory for Procurement */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="h-5 w-5 text-purple-600" /> Verified Computer Village Suppliers
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendors">View Full Directory</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v) => (
            <div key={v.id} className="p-4 rounded-xl border bg-gray-50/50 dark:bg-gray-800/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    {v.businessName}
                    {v.status === "VERIFIED" && (
                      <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-blue-600 shrink-0" /> {v.officeAddress}
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
                  {v.rating > 0 ? `${v.rating} ★` : "New Store"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-2 border-t">
                <span>{v._count.products} Products Listed</span>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1" asChild>
                  <Link href={`/dashboard/messages?vendorId=${v.userId}`}>
                    <MessageSquare className="h-3.5 w-3.5" /> Request Quote
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
