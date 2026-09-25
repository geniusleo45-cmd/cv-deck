import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { CartProvider } from "@/components/cart/CartProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/ReportButton";
import { Store, ShieldCheck, MapPin, Star, MessageSquare } from "lucide-react";

// Vendor ratings and inventory counts come from the live marketplace database.
export const dynamic = "force-dynamic";

export default async function PublicVendorsPage() {
  const vendors = await prisma.vendor.findMany({
    where: { status: "VERIFIED" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      _count: { select: { products: true } },
    },
    orderBy: { rating: "desc" },
  });

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50/40 dark:bg-gray-950 flex flex-col">
        <Navbar />

        <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Store className="h-7 w-7 text-blue-600" /> Computer Village Verified Vendor Directory
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Connect directly with verified electronics shops on Pepple Street, Otigba Street, Medical Road, and Ikeja Plaza.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                      {vendor.businessName}
                      {vendor.status === "VERIFIED" && (
                        <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                      )}
                    </h3>
                    <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
                      {vendor.rating > 0 ? `${vendor.rating} ★` : "New Store"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" /> {vendor.officeAddress}
                  </p>

                  <div className="pt-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-bold">{vendor._count.products}</span> active product listings
                  </div>
                </div>

                <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                  <ReportButton targetType="VENDOR" targetId={vendor.id} />
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/vendors/${vendor.id}`}>Visit Store</Link>
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1" asChild>
                    <Link href={`/dashboard/messages?receiverId=${vendor.user.id}`}>
                      <MessageSquare className="h-3.5 w-3.5" /> Direct Chat
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CartProvider>
  );
}
