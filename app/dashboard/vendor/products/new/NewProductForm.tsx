"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const specs = Object.fromEntries(
      String(form.get("specs") || "").split("\n").map((line) => line.split(":").map((part) => part.trim())).filter(([key, value]) => key && value)
    );
    const images = String(form.get("images") || "").split("\n").map((url) => url.trim()).filter(Boolean);
    const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), price: Number(form.get("price")), stock: Number(form.get("stock")), categoryId: form.get("categoryId"), condition: form.get("condition"), locationZone: form.get("locationZone"), images, specs }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to create product."); setSaving(false); return; }
    router.push("/dashboard/vendor/products");
    router.refresh();
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6 dark:bg-gray-900 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Product name<input name="name" required minLength={3} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Category<select name="categoryId" required className="rounded-lg border p-2 font-normal dark:bg-gray-800"><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold md:col-span-2">Description<textarea name="description" required minLength={10} rows={4} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Price (₦)<input name="price" type="number" min="1" required className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Stock quantity<input name="stock" type="number" min="0" required className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Condition<select name="condition" defaultValue="NEW" className="rounded-lg border p-2 font-normal dark:bg-gray-800"><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select></label><label className="grid gap-1 text-sm font-semibold">Computer Village zone<input name="locationZone" defaultValue="Computer Village Ikeja" required className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold md:col-span-2">Image URLs <span className="font-normal text-gray-500">One HTTPS URL per line</span><textarea name="images" rows={3} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold md:col-span-2">Specifications <span className="font-normal text-gray-500">One `Label: value` per line</span><textarea name="specs" rows={3} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label>{error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}<div className="md:col-span-2"><button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Creating listing..." : "Create product listing"}</button></div></form>;
}
