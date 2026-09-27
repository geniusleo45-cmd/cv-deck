"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

type WishlistAddToCartButtonProps = { productId: string; name: string; price: number; stock: number; status: string; vendorId: string; vendorName: string };

export function WishlistAddToCartButton({ productId, name, price, stock, status, vendorId, vendorName }: WishlistAddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const available = status === "ACTIVE" && stock > 0;

  function addToCart() {
    if (!available) return;
    addItem({ productId, name, price, maxQuantity: stock, vendorId, vendorName });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return <button type="button" onClick={addToCart} disabled={!available || added} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400">{added ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}{available ? added ? "Added" : "Add to cart" : "Unavailable"}</button>;
}
