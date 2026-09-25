import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock, CreditCard, MapPin, PackageCheck, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PrintReceiptButton } from "./PrintReceiptButton";

const fulfillmentSteps = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const order = await prisma.order.findUnique({ where: { id }, include: { user: { select: { name: true, email: true, phone: true } }, payment: true, items: { include: { product: { include: { vendor: true } } } } } });
  if (!order) notFound();

  let items = order.items;
  if (user.role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!vendor) notFound();
    items = order.items.filter((item) => item.product.vendorId === vendor.id);
    if (!items.length) notFound();
  } else if (user.role !== "ADMIN" && order.userId !== user.id) {
    notFound();
  }

  const displayTotal = user.role === "VENDOR" ? items.reduce((sum, item) => sum + item.price * item.quantity, 0) : order.totalAmount;
  const statusIndex = fulfillmentSteps.indexOf(order.status as (typeof fulfillmentSteps)[number]);
  const isPaid = order.payment?.status === "SUCCESS";

  return <section className="mx-auto max-w-4xl space-y-6 print:max-w-none"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600"><ArrowLeft className="h-4 w-4" /> Back to orders</Link><PrintReceiptButton /></div><article className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900 sm:p-8"><header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">CV Deck order receipt</p><h1 className="mt-1 text-2xl font-black">#{order.orderNumber}</h1><p className="mt-1 text-sm text-gray-500">Placed {new Date(order.createdAt).toLocaleString()}</p></div><div className="text-left sm:text-right"><p className="text-xs text-gray-500">Order total</p><p className="text-2xl font-black text-blue-600">₦{displayTotal.toLocaleString()}</p><p className={`mt-1 text-xs font-bold ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{isPaid ? "Paid & verified" : "Awaiting payment"}</p></div></header><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500"><MapPin className="h-4 w-4" /> Delivery</p><p className="text-sm font-semibold">{order.shippingAddress || "Delivery address not provided"}</p><p className="mt-1 text-sm text-gray-500">{order.user.name} · {order.user.phone || order.user.email}</p>{order.trackingReference && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">Shipment reference: {order.trackingReference}</p>}</div><div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500"><CreditCard className="h-4 w-4" /> Payment</p>{order.payment ? <><p className="text-sm font-semibold">{order.payment.provider} · {order.payment.status}</p><p className="mt-1 break-all text-xs text-gray-500">Reference: {order.payment.reference}</p></> : <p className="text-sm text-gray-500">Payment has not been started.</p>}</div></div><div><h2 className="mb-3 flex items-center gap-2 font-bold"><PackageCheck className="h-5 w-5 text-blue-600" /> Items</h2><div className="divide-y rounded-xl border">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-bold">{item.product.name}</p><p className="mt-1 text-xs text-gray-500">{item.product.vendor.businessName} · Qty {item.quantity} × ₦{item.price.toLocaleString()}</p></div><p className="font-bold">₦{(item.price * item.quantity).toLocaleString()}</p></div>)}</div></div>{order.status !== "CANCELLED" && isPaid && <div className="rounded-xl border p-4"><p className="mb-4 flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-blue-600" /> Fulfillment progress</p><ol className="grid grid-cols-3 gap-3">{fulfillmentSteps.map((step, index) => { const complete = statusIndex >= index; return <li key={step} className="text-center"><span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>{complete ? <CheckCircle className="h-4 w-4" /> : index + 1}</span><span className={`mt-2 block text-xs font-semibold ${complete ? "text-emerald-700" : "text-gray-500"}`}>{step[0]}{step.slice(1).toLowerCase()}</span></li>; })}</ol></div>}{order.status === "PENDING" && <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><Clock className="h-5 w-5" /> Payment is pending. Return to your orders to complete checkout.</div>}</article></section>;
}
