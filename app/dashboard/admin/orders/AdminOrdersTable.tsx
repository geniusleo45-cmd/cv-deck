"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search } from "lucide-react";

type Order = { id: string; orderNumber: string; customer: string; totalAmount: number; status: string; createdAt: string; payment: { provider: string; status: string } | null; itemCount: number; vendors: string[] };
const statuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export function AdminOrdersTable({ orders: initialOrders }: { orders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const visibleOrders = useMemo(() => orders.filter((order) => (filter === "ALL" || order.status === filter) && `${order.orderNumber} ${order.customer} ${order.vendors.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [filter, orders, query]);

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    const response = await fetch(`/api/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    setUpdating(null);
  }

  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4 dark:bg-gray-900"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">All orders</p><p className="mt-1 text-2xl font-black">{orders.length}</p></div><div className="rounded-xl border bg-white p-4 dark:bg-gray-900"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Awaiting payment</p><p className="mt-1 text-2xl font-black text-amber-600">{orders.filter((order) => order.payment?.status !== "SUCCESS").length}</p></div><div className="rounded-xl border bg-white p-4 dark:bg-gray-900"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">In fulfillment</p><p className="mt-1 text-2xl font-black text-blue-600">{orders.filter((order) => order.status === "PROCESSING" || order.status === "SHIPPED").length}</p></div></div><div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 dark:bg-gray-900 sm:flex-row sm:justify-between"><label className="relative block sm:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer, or vendor" className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm dark:bg-gray-800" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-800"><option value="ALL">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="p-4">Order</th><th>Customer / vendor</th><th>Payment</th><th>Total</th><th>Fulfillment</th><th className="pr-4">Details</th></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id} className="border-b last:border-0 align-top"><td className="p-4"><p className="font-bold">#{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p></td><td><p className="font-semibold">{order.customer}</p><p className="mt-1 max-w-44 truncate text-xs text-gray-500">{order.vendors.join(", ")}</p></td><td><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${order.payment?.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{order.payment ? `${order.payment.provider} · ${order.payment.status}` : "Not started"}</span></td><td className="font-bold">₦{order.totalAmount.toLocaleString()}</td><td><select aria-label={`Update ${order.orderNumber} status`} value={order.status} disabled={updating === order.id} onChange={(event) => updateStatus(order.id, event.target.value)} className="rounded-lg border px-2 py-1.5 text-xs font-bold dark:bg-gray-800">{statuses.map((status) => <option key={status}>{status}</option>)}</select>{updating === order.id && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-blue-600" />}</td><td className="pr-4"><Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"><CheckCircle2 className="h-3.5 w-3.5" /> Open</Link></td></tr>)}</tbody></table>{!visibleOrders.length && <p className="p-8 text-center text-sm text-gray-500">No orders match this filter.</p>}</div></div>;
}
