import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/rbac";
import { InventoryTable } from "./InventoryTable";

export default async function VendorProductsPage() {
  const user = await requireVendor();
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id }, include: { products: { include: { category: true }, orderBy: { createdAt: "desc" } } } });
  const products = vendor?.products || [];
  return <section className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-black">My inventory</h1><p className="mt-1 text-sm text-gray-500">Manage product listings, stock levels, and availability.</p></div><Link href="/dashboard/vendor/products/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Add product</Link></div><InventoryTable products={products.map((product) => ({ id: product.id, name: product.name, category: product.category.name, price: product.price, stock: product.stock, status: product.status }))} /></section>;
}
