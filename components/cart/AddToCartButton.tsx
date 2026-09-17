"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

type AddToCartButtonProps = { product: { id: string; name: string; price: number; stock: number } };

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const addToCart = () => {
    addItem({ productId: product.id, name: product.name, price: product.price, maxQuantity: product.stock });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  return <button type="button" onClick={addToCart} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">{added ? <><Check className="size-4" /> Added to cart</> : <><ShoppingCart className="size-4" /> Add to cart</>}</button>;
}
