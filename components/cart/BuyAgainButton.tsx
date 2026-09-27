"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";

type ReorderItem = { productId: string; name: string; price: number; stock: number; status: string; quantity: number; vendorId?: string; vendorName?: string };

export function BuyAgainButton({ items }: { items: ReorderItem[] }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const availableItems = items.filter((item) => item.status === "ACTIVE" && item.stock > 0);
  const unavailableCount = items.length - availableItems.length;

  function buyAgain() {
    setAdding(true);
    for (const item of availableItems) {
      const quantity = Math.min(item.quantity, item.stock);
      for (let index = 0; index < quantity; index += 1) addItem({ productId: item.productId, name: item.name, price: item.price, maxQuantity: item.stock, vendorId: item.vendorId, vendorName: item.vendorName });
    }
    const params = new URLSearchParams({ reordered: String(availableItems.length) });
    if (unavailableCount) params.set("unavailable", String(unavailableCount));
    router.push(`/dashboard/cart?${params.toString()}`);
  }

  if (!availableItems.length) return <span className="text-xs font-semibold text-gray-500">These items are no longer available.</span>;
  return <button type="button" onClick={buyAgain} disabled={adding} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"><ShoppingCart className="h-4 w-4" /> {adding ? "Adding to cart..." : "Buy again"}</button>;
}
