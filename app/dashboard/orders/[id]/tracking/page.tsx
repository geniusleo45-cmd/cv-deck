import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, MapPin, PackageCheck, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const steps = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const order = await prisma.order.findUnique({ where: { id }, include: { user: { select: { name: true, phone: true, email: true } }, items: { include: { product: { select: { vendorId: true, name: true } } } } } });
  if (!order) notFound();
  const isOwner = order.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  const vendor = user.role === "VENDOR" ? await prisma.vendor.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  const isVendor = Boolean(vendor && order.items.length && order.items.every((item) => item.product.vendorId === vendor.id));
  if (!isOwner && !isAdmin && !isVendor) notFound();
  const currentStep = steps.indexOf(order.status as (typeof steps)[number]);

  return <section className="mx-auto max-w-2xl space-y-6"><Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600"><ArrowLeft className="h-4 w-4" /> Back to order</Link><article className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900 sm:p-8"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40"><Truck className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">CV Deck shipment tracking</p><h1 className="mt-1 text-2xl font-black">Order #{order.orderNumber}</h1></div></div><div className="mt-6 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30"><p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Tracking number</p><p className="mt-1 break-all font-mono text-lg font-black text-blue-900 dark:text-blue-100">{order.trackingReference || "Generated when the vendor dispatches this order"}</p></div><div className="mt-6"><p className="mb-4 flex items-center gap-2 text-sm font-bold"><PackageCheck className="h-4 w-4 text-blue-600" /> Shipment progress</p><ol className="space-y-4">{steps.map((step, index) => { const complete = currentStep >= index; return <li key={step} className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-800"}`}>{complete ? <CheckCircle className="h-4 w-4" /> : index + 1}</span><span className={`text-sm font-semibold ${complete ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"}`}>{step[0]}{step.slice(1).toLowerCase()}</span></li>; })}</ol></div><div className="mt-6 rounded-xl border p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500"><MapPin className="h-4 w-4" /> Delivery destination</p><p className="mt-2 text-sm font-semibold">{order.shippingAddress || "Delivery address not provided"}</p><p className="mt-1 text-xs text-gray-500">{order.user.name} · {order.user.phone || order.user.email}</p></div></article></section>;
}
