import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/rbac";

export default async function VendorProductsPage() {
  const user = await requireVendor();
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id }, include: { products: { include: { category: true }, orderBy: { createdAt: "desc" } } } });
  return <section className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-black">My inventory</h1><p className="mt-1 text-sm text-gray-500">Manage product listings and stock.</p></div><Link href="/dashboard/vendor/products/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Add product</Link></div><div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="p-4">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead><tbody>{vendor?.products.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4 font-semibold">{product.name}</td><td>{product.category.name}</td><td>₦{product.price.toLocaleString()}</td><td>{product.stock}</td><td>{product.status}</td><td><Link href={`/dashboard/vendor/products/${product.id}`} className="font-bold text-blue-600">Edit</Link></td></tr>)}</tbody></table>{!vendor?.products.length && <p className="p-8 text-center text-sm text-gray-500">No inventory yet. Add your first product.</p>}</div></section>;
}
