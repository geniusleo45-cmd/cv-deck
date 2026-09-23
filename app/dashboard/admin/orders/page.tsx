import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { AdminOrdersTable } from "./AdminOrdersTable";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({ include: { user: { select: { name: true, email: true } }, payment: true, items: { include: { product: { include: { vendor: { select: { businessName: true } } } } } } }, orderBy: { createdAt: "desc" } });
  return <section className="space-y-6"><div><h1 className="text-2xl font-black">Global orders</h1><p className="mt-1 text-sm text-gray-500">Monitor marketplace payments and fulfillment across all vendors.</p></div><AdminOrdersTable orders={orders.map((order) => ({ id: order.id, orderNumber: order.orderNumber, customer: order.user.name || order.user.email, totalAmount: order.totalAmount, status: order.status, createdAt: order.createdAt.toISOString(), payment: order.payment ? { provider: order.payment.provider, status: order.payment.status } : null, itemCount: order.items.length, vendors: [...new Set(order.items.map((item) => item.product.vendor.businessName))] }))} /></section>;
}
