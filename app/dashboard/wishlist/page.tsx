import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag } from "lucide-react";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { RemoveWishlistButton } from "./RemoveWishlistButton";

export default async function WishlistPage() {
  const user = await requireAuth();
  const items = await prisma.wishlistItem.findMany({ where: { userId: user.id }, include: { product: { include: { category: true, vendor: true } } }, orderBy: { createdAt: "desc" } });

  return <section className="space-y-6"><div><h1 className="flex items-center gap-2 text-2xl font-black"><Heart className="h-6 w-6 text-red-500" /> Saved Products</h1><p className="mt-1 text-sm text-gray-500">Keep an eye on products you may want to buy later.</p></div>{items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(({ product }) => { let image = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80"; try { image = JSON.parse(product.images)[0] || image; } catch {} return <article key={product.id} className="overflow-hidden rounded-2xl border bg-white dark:bg-gray-900"><Link href={`/dashboard/marketplace/${product.id}`} className="relative block aspect-[4/3] bg-gray-100"><Image src={image} alt={product.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /></Link><div className="space-y-3 p-4"><div><p className="text-xs text-gray-500">{product.category.name}</p><Link href={`/dashboard/marketplace/${product.id}`} className="font-bold hover:text-blue-600">{product.name}</Link><p className="mt-1 text-lg font-black">₦{product.price.toLocaleString()}</p></div><div className="flex items-center justify-between"><span className="text-xs text-gray-500">{product.vendor.businessName}</span><RemoveWishlistButton productId={product.id} /></div></div></article>; })}</div> : <div className="rounded-2xl border border-dashed p-10 text-center"><Heart className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-3 font-bold">No saved products yet</h2><p className="mt-1 text-sm text-gray-500">Save items from the marketplace to find them here later.</p><Link href="/dashboard/marketplace" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"><ShoppingBag className="h-4 w-4" /> Browse marketplace</Link></div>}</section>;
}
