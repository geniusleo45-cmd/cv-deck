"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export default function CheckoutButton() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function checkout() {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ productId, quantity }) => ({ productId, quantity })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to place your order.");
      clearCart();
      const paymentResponse = await fetch("/api/payments/flutterwave/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: result.orderId }) });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(payment.error || "Order created, but payment could not be started. You can try again from My orders.");
      window.location.assign(payment.authorizationUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to place your order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <><button type="button" onClick={checkout} disabled={isSubmitting || items.length === 0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60">{isSubmitting && <LoaderCircle className="size-4 animate-spin" />}{isSubmitting ? "Opening secure checkout..." : "Continue to payment"}</button>{error && <p role="alert" className="mt-3 text-center text-xs text-destructive">{error}</p>}</>;
}
