"use client";

import { useState } from "react";

type Product = { id: string; name: string; price: number };
type PackageName = "DAILY" | "WEEKLY" | "MONTHLY";
const packages: { id: PackageName; title: string; price: number; duration: string; description: string }[] = [
  { id: "DAILY", title: "Daily", price: 1000, duration: "1 day", description: "A boost for flash offers and new stock." },
  { id: "WEEKLY", title: "Weekly", price: 5000, duration: "7 days", description: "Consistent visibility for a full week." },
  { id: "MONTHLY", title: "Monthly", price: 15000, duration: "30 days", description: "Best value for ongoing promotion." },
];

export function PremiumListingForm({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [packageName, setPackageName] = useState<PackageName>("WEEKLY");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = packages.find((item) => item.id === packageName)!;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/ad-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, package: packageName }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create Premium Listing.");
      setMessage("Premium Listing created. Choose a payment method in the next step to activate it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create Premium Listing."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="space-y-6"><label className="block text-sm font-bold">Product to promote<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm dark:bg-gray-900">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · ₦{product.price.toLocaleString()}</option>)}</select></label><div className="grid gap-4 md:grid-cols-3">{packages.map((item) => <label key={item.id} className={`cursor-pointer rounded-2xl border p-5 transition ${packageName === item.id ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30" : "bg-white dark:bg-gray-900"}`}><input type="radio" name="package" value={item.id} checked={packageName === item.id} onChange={() => setPackageName(item.id)} className="sr-only" /><p className="font-black">{item.title}</p><p className="mt-1 text-2xl font-black text-blue-600">₦{item.price.toLocaleString()}</p><p className="mt-1 text-xs font-bold text-gray-500">{item.duration}</p><p className="mt-3 text-xs text-gray-600 dark:text-gray-300">{item.description}</p></label>)}</div><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900"><p className="text-sm font-semibold">Selected: {selected.title} · ₦{selected.price.toLocaleString()}</p><button disabled={!productId || saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Creating..." : "Continue to payment"}</button></div>{message && <p role="status" className="text-sm font-semibold text-blue-700 dark:text-blue-300">{message}</p>}</form>;
}
