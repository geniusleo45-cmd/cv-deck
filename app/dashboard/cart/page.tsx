"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { items, total, setQuantity, removeItem, clearCart } = useCart();
  const router = useRouter();
  const checkoutFormRef = useRef<HTMLFormElement>(null);

  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<"FLUTTERWAVE" | "PAYSTACK">("FLUTTERWAVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSavedContact = async () => {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;
        const profile = await response.json();
        if (profile.phone) setPhone(profile.phone);
        if (profile.deliveryAddress) setShippingAddress(profile.deliveryAddress);
      } catch (error) {
        console.error("Failed to load saved contact details", error);
      }
    };

    loadSavedContact();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress,
          phone,
          paymentProvider,
          items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Checkout failed");
      } else {
        const paymentResponse = await fetch(`/api/payments/${paymentProvider.toLowerCase()}/initialize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.order.id }),
        });
        const payment = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(payment.error || `Order created, but ${paymentProvider === "PAYSTACK" ? "Paystack" : "Flutterwave"} checkout could not be opened.`);
        clearCart();
        window.location.assign(payment.authorizationUrl);
      }
    } catch (err) {
      setError("An unexpected error occurred during checkout");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Cart is Currently Empty</h2>
        <p className="text-xs text-gray-500">
          Browse verified laptops, mobile devices, and tech accessories in Computer Village.
        </p>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold" asChild>
          <Link href="/dashboard/marketplace">Explore Marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-blue-600" /> Shopping Cart & Checkout
        </h1>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <div className="sticky top-16 z-30 -mx-4 border-y bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:bg-gray-950/95 sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => checkoutFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="flex w-full items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-left text-sm font-bold text-white shadow-md shadow-blue-500/20"
        >
          <span>Checkout · ₦{total.toLocaleString()}</span>
          <span className="flex items-center gap-1 text-xs">Delivery & payment <ArrowRight className="h-4 w-4" /></span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Item List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white border-b pb-3">
              Order Items ({items.length})
            </h2>

            <div className="divide-y">
              {items.map((item) => (
                <div key={item.productId} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-blue-600 font-bold mt-1">
                      ₦{item.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center border rounded-lg bg-gray-50 dark:bg-gray-800">
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          aria-label={`Decrease ${item.name} quantity`}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity}
                          aria-label={`Increase ${item.name} quantity`}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">{item.maxQuantity} available</p>
                    </div>

                    <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[80px] text-right">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>

                    <button
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Checkout Form Card */}
        <div className="space-y-4">
          <form ref={checkoutFormRef} onSubmit={handleCheckout} className="scroll-mt-36 rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white border-b pb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" /> Delivery & Payment
            </h2>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Delivery Address in Nigeria
              </Label>
              <Input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="e.g. 14 Opebi Road, Ikeja, Lagos"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Contact Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                required
                className="text-xs"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-gray-700 dark:text-gray-300">Payment method</legend>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition ${paymentProvider === "FLUTTERWAVE" ? "border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                <input type="radio" name="paymentProvider" value="FLUTTERWAVE" checked={paymentProvider === "FLUTTERWAVE"} onChange={() => setPaymentProvider("FLUTTERWAVE")} className="accent-blue-600" />
                <span><strong className="block text-sm">Flutterwave</strong>Card, bank transfer, USSD, and more.</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition ${paymentProvider === "PAYSTACK" ? "border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                <input type="radio" name="paymentProvider" value="PAYSTACK" checked={paymentProvider === "PAYSTACK"} onChange={() => setPaymentProvider("PAYSTACK")} className="accent-blue-600" />
                <span><strong className="block text-sm">Paystack</strong>Secure card, bank transfer, USSD, and mobile money payments.</span>
              </label>
            </fieldset>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              You&apos;ll complete this order securely through {paymentProvider === "PAYSTACK" ? "Paystack" : "Flutterwave"}.
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Computer Village Escrow Fee</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-2 border-t">
                <span>Total Due</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 gap-2 text-sm"
            >
              {loading ? "Processing Order..." : "Confirm & Pay Now"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
