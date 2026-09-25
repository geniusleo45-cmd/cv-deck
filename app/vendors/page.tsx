import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { CartProvider } from "@/components/cart/CartProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/ReportButton";
import { Store, ShieldCheck, MapPin, Star, MessageSquare, Search } from "lucide-react";

// Vendor ratings and inventory counts come from the live marketplace database.
export const dynamic = "force-dynamic";

export default async function PublicVendorsPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const { query = "" } = await searchParams;
  const search = query.trim();
  const vendors = await prisma.vendor.findMany({
    where: { status: "VERIFIED", ...(search ? { OR: [{ businessName: { contains: search, mode: "insensitive" } }, { officeAddress: { contains: search, mode: "insensitive" } }] } : {}) },
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
              Connect directly with verified electronics shops across the wider Computer Village cluster—from Otigba, Pepple, Kodesoh, and Ola Ayeni to Medical Road and surrounding Ikeja access streets.
            </p>
          </div>

          <form action="/vendors" className="flex max-w-xl gap-2">
            <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input name="query" defaultValue={search} placeholder="Search shop name or location, e.g. Otigba" className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm dark:bg-gray-900" /></label>
            <Button type="submit" className="bg-blue-600 font-bold text-white hover:bg-blue-700">Search</Button>
            {search && <Button variant="outline" asChild><Link href="/vendors">Clear</Link></Button>}
          </form>

          {search && <p className="text-sm text-gray-500">{vendors.length} verified vendor{vendors.length === 1 ? "" : "s"} found for “{search}”.</p>}

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
          {!vendors.length && <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">No verified vendors match your search. Try a shop name, street, or area.</div>}
        </div>
      </div>
    </CartProvider>
  );
}
