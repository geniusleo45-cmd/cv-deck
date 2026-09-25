import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartProvider } from "@/components/cart/CartProvider";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ReportButton } from "@/components/ReportButton";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, MapPin, MessageSquare, Package, ShieldCheck, Star, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendorStorefront({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      user: { select: { id: true, name: true } },
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true } } },
      },
    },
  });
  if (!vendor || vendor.status !== "VERIFIED") notFound();

  return <CartProvider><div className="flex min-h-screen flex-col bg-gray-50/40 dark:bg-gray-950"><Navbar /><main className="container mx-auto flex-1 space-y-6 px-4 py-8 sm:px-6"><Button variant="ghost" size="sm" asChild className="gap-2"><Link href="/vendors"><ArrowLeft className="h-4 w-4" /> Vendor directory</Link></Button><section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-gray-900"><div className="relative h-40 bg-gradient-to-r from-blue-700 to-indigo-800 sm:h-52">{vendor.banner && <Image src={vendor.banner} alt={`${vendor.businessName} banner`} fill priority className="object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" /></div><div className="relative px-5 pb-6 sm:px-8"><div className="absolute -top-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-blue-100 shadow-lg dark:border-gray-900"><Image src={vendor.logo || "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=160&q=80"} alt={`${vendor.businessName} logo`} fill sizes="96px" className="object-cover" /></div><div className="pt-16 sm:pt-6 sm:pl-28"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white"><Store className="h-6 w-6 text-blue-600" /> {vendor.businessName}<ShieldCheck className="h-5 w-5 text-purple-600" /></h1><p className="mt-1 text-sm text-gray-500">Verified Computer Village vendor</p><p className="mt-3 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300"><MapPin className="h-4 w-4 text-blue-600" /> {vendor.officeAddress}</p></div><div className="flex items-end gap-4"><ReportButton targetType="VENDOR" targetId={vendor.id} /><Button asChild className="gap-2 bg-blue-600 font-bold text-white hover:bg-blue-700"><Link href={`/dashboard/messages?receiverId=${vendor.user.id}`}><MessageSquare className="h-4 w-4" /> Message vendor</Link></Button></div></div><div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"><Star className="h-4 w-4 fill-amber-400" /> {vendor.rating > 0 ? `${vendor.rating} rating` : "New store"}</span><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><Package className="h-4 w-4" /> {vendor.products.length} active listings</span></div></div></div></section><section><div className="mb-5"><h2 className="text-xl font-black text-gray-900 dark:text-white">Shop inventory</h2><p className="mt-1 text-sm text-gray-500">Available products listed by {vendor.businessName}.</p></div>{vendor.products.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{vendor.products.map((product) => <ProductCard key={product.id} product={{ ...product, vendor: { id: vendor.id, businessName: vendor.businessName, officeAddress: vendor.officeAddress, status: vendor.status, rating: vendor.rating } }} />)}</div> : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">This verified vendor has no active listings yet.</div>}</section></main></div></CartProvider>;
}
