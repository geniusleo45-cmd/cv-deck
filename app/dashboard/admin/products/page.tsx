import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { ProductModerationTable } from "./ProductModerationTable";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ include: { vendor: true, category: true }, orderBy: { createdAt: "desc" } });
  return <section className="space-y-6"><div><h1 className="text-2xl font-black">Marketplace products</h1><p className="mt-1 text-sm text-gray-500">Review listings and control which products are available in the marketplace.</p></div><ProductModerationTable products={products.map((product) => ({ id: product.id, name: product.name, vendor: product.vendor.businessName, category: product.category.name, price: product.price, stock: product.stock, status: product.status, createdAt: product.createdAt.toISOString() }))} /></section>;
}
