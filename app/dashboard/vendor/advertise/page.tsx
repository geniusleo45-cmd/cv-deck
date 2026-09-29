import { Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PremiumListingForm } from "./PremiumListingForm";

export default async function AdvertisePage() {
  const user = await getCurrentUser();
  const vendor = await prisma.vendor.findUnique({ where: { userId: user?.id }, include: { products: { where: { status: "ACTIVE", stock: { gt: 0 } }, select: { id: true, name: true, price: true }, orderBy: { createdAt: "desc" } } } });
  return <section className="mx-auto max-w-4xl space-y-6"><div><h1 className="flex items-center gap-2 text-2xl font-black"><Megaphone className="h-6 w-6 text-blue-600" /> Premium Listings</h1><p className="mt-1 text-sm text-gray-500">Promote an active product in featured CV Deck marketplace placements. Paid listings are clearly marked as sponsored.</p></div>{vendor?.status !== "VERIFIED" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Your shop must be verified before you can purchase Premium Listings.</div> : !vendor.products.length ? <div className="rounded-2xl border border-dashed p-8 text-sm text-gray-500">Add an active, in-stock product before creating a Premium Listing.</div> : <PremiumListingForm products={vendor.products} />}</section>;
}
