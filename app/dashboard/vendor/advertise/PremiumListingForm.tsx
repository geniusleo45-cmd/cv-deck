"use client";

import { useState } from "react";
import { premiumPackages } from "@/lib/premiumListings";

type Product = { id: string; name: string; price: number };
type PackageName = "DAILY" | "WEEKLY" | "MONTHLY";
type ResumeCampaign = {
  id: string;
  productId: string;
  package: PackageName;
  amount: number;
  paymentProvider: string | null;
};
type RenewalCampaign = {
  id: string;
  productId: string;
  productName: string;
  package: PackageName;
};
const packages: { id: PackageName; title: string; price: number; duration: string; description: string }[] = [
  { id: "DAILY", title: "Daily", price: premiumPackages.DAILY.amount, duration: "1 day", description: "A boost for flash offers and new stock." },
  { id: "WEEKLY", title: "Weekly", price: premiumPackages.WEEKLY.amount, duration: "7 days", description: "Consistent visibility for a full week." },
  { id: "MONTHLY", title: "Monthly", price: premiumPackages.MONTHLY.amount, duration: "30 days", description: "Best value for ongoing promotion." },
];

export function PremiumListingForm({ products, resumeCampaign, renewalCampaign }: { products: Product[]; resumeCampaign?: ResumeCampaign; renewalCampaign?: RenewalCampaign }) {
  const [productId, setProductId] = useState(resumeCampaign?.productId || renewalCampaign?.productId || products[0]?.id || "");
  const [packageName, setPackageName] = useState<PackageName>(resumeCampaign?.package || renewalCampaign?.package || "WEEKLY");
  const [campaignId, setCampaignId] = useState<string | null>(resumeCampaign?.id || null);
  const [message, setMessage] = useState(resumeCampaign ? "Continue the existing Premium Listing with its secure checkout." : renewalCampaign ? "Renewal details are pre-filled. A fresh payment starts a new placement window." : "");
  const [saving, setSaving] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"paystack" | "flutterwave" | null>(null);
  const [checkoutProvider, setCheckoutProvider] = useState<"paystack" | "flutterwave" | null>(resumeCampaign?.paymentProvider === "PAYSTACK" ? "paystack" : resumeCampaign?.paymentProvider === "FLUTTERWAVE" ? "flutterwave" : null);
  const [campaignAmount, setCampaignAmount] = useState<number | null>(resumeCampaign?.amount ?? null);
  const selectedPackage = packages.find((item) => item.id === packageName)!;
  const selected = { ...selectedPackage, price: campaignAmount ?? selectedPackage.price };
  const lockedProvider = checkoutProvider;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/ad-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, package: packageName }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create Premium Listing.");
      setCampaignId(data.id);
      setCampaignAmount(data.amount);
      setPackageName(data.package as PackageName);
      setCheckoutProvider(data.paymentProvider === "PAYSTACK" ? "paystack" : data.paymentProvider === "FLUTTERWAVE" ? "flutterwave" : null);
      setMessage(response.status === 200 ? "An existing pending Premium Listing was found. Choose its secure payment method to activate it." : "Premium Listing is ready. Choose its secure payment method to activate it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create Premium Listing."); }
    finally { setSaving(false); }
  }

  async function startPayment(provider: "paystack" | "flutterwave") {
    if (!campaignId) return;
    setPaymentProvider(provider);
    setMessage("");
    try {
      const response = await fetch(`/api/ad-campaigns/${encodeURIComponent(campaignId)}/payments/${provider}/initialize`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.authorizationUrl) throw new Error(data.error || "Unable to start payment.");
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start payment.");
      setPaymentProvider(null);
    }
  }

  return <form onSubmit={submit} className="space-y-6">{renewalCampaign && !campaignId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><p className="font-black">Renew {renewalCampaign.productName}</p><p className="mt-1">Your previous campaign remains in your performance history. This starts a new paid placement when checkout is confirmed.</p></div>}<label className="block text-sm font-bold">Product to promote<select value={productId} disabled={Boolean(campaignId)} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · ₦{product.price.toLocaleString()}</option>)}</select></label><div className="grid gap-4 md:grid-cols-3">{packages.map((item) => <label key={item.id} className={`cursor-pointer rounded-2xl border p-5 transition ${packageName === item.id ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30" : "bg-white dark:bg-gray-900"} ${campaignId ? "cursor-not-allowed opacity-60" : ""}`}><input type="radio" name="package" value={item.id} disabled={Boolean(campaignId)} checked={packageName === item.id} onChange={() => setPackageName(item.id)} className="sr-only" /><p className="font-black">{item.title}</p><p className="mt-1 text-2xl font-black text-blue-600">₦{item.price.toLocaleString()}</p><p className="mt-1 text-xs font-bold text-gray-500">{item.duration}</p><p className="mt-3 text-xs text-gray-600 dark:text-gray-300">{item.description}</p></label>)}</div><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900"><p className="text-sm font-semibold">Selected: {selected.title} · ₦{selected.price.toLocaleString()}</p><button disabled={!productId || saving || Boolean(campaignId)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Creating..." : campaignId ? "Payment selection ready" : renewalCampaign ? "Create renewal payment" : "Continue to payment"}</button></div>{campaignId && <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30"><div><p className="font-black text-gray-900 dark:text-white">{lockedProvider ? `Resume ${lockedProvider === "paystack" ? "Paystack" : "Flutterwave"} checkout` : "Choose your payment method"}</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Your listing will activate only after the payment provider confirms ₦{selected.price.toLocaleString()}.</p></div><div className="grid gap-3 sm:grid-cols-2">{(!lockedProvider || lockedProvider === "paystack") && <button type="button" onClick={() => startPayment("paystack")} disabled={Boolean(paymentProvider)} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-700 disabled:opacity-60">{paymentProvider === "paystack" ? "Opening Paystack..." : lockedProvider ? "Resume Paystack" : "Pay with Paystack"}</button>}{(!lockedProvider || lockedProvider === "flutterwave") && <button type="button" onClick={() => startPayment("flutterwave")} disabled={Boolean(paymentProvider)} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-60">{paymentProvider === "flutterwave" ? "Opening Flutterwave..." : lockedProvider ? "Resume Flutterwave" : "Pay with Flutterwave"}</button>}</div></div>}{message && <p role="status" className="text-sm font-semibold text-blue-700 dark:text-blue-300">{message}</p>}</form>;
}
