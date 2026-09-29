"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function PremiumListingPaymentCallbackContent() {
  const searchParams = useSearchParams();
  const providerParam = searchParams.get("provider");
  const provider = providerParam === "paystack" || providerParam === "flutterwave" ? providerParam : null;
  const campaignId = searchParams.get("campaignId");
  const reference = provider === "paystack"
    ? (searchParams.get("reference") || searchParams.get("trxref"))
    : provider === "flutterwave" ? searchParams.get("tx_ref") : null;
  const transactionId = searchParams.get("transaction_id");
  const [state, setState] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your Premium Listing payment...");

  useEffect(() => {
    if (!provider || !campaignId || !reference || (provider === "flutterwave" && !transactionId)) {
      setState("failed");
      setMessage("The payment provider did not return the details needed to verify this Premium Listing.");
      return;
    }

    fetch(`/api/ad-campaigns/${encodeURIComponent(campaignId)}/payments/${provider}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(provider === "paystack" ? { reference } : { txRef: reference, transactionId }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment could not be verified.");
        setState("success");
        setMessage("Your payment is confirmed and the Premium Listing is now active.");
      })
      .catch((error) => {
        setState("failed");
        setMessage(error instanceof Error ? error.message : "Payment could not be verified.");
      });
  }, [campaignId, provider, reference, transactionId]);

  const listingLink = "/dashboard/vendor/advertise";
  return <div className="mx-auto max-w-md space-y-6 py-16 text-center">
    {state === "verifying" && <div className="space-y-3"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" /><h1 className="text-lg font-bold text-gray-900 dark:text-white">Verifying payment...</h1><p className="text-xs text-gray-500">Please wait while we activate your Premium Listing.</p></div>}
    {state === "success" && <div className="space-y-4 rounded-3xl border bg-white p-8 shadow-xl dark:bg-gray-900"><CheckCircle className="mx-auto h-16 w-16 text-emerald-500" /><h1 className="text-2xl font-black text-gray-900 dark:text-white">Premium Listing activated!</h1><p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p><Button size="lg" className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700" asChild><Link href={listingLink}>Manage Premium Listings</Link></Button></div>}
    {state === "failed" && <div className="space-y-4 rounded-3xl border bg-white p-8 shadow-xl dark:bg-gray-900"><AlertCircle className="mx-auto h-16 w-16 text-red-500" /><h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment verification failed</h1><p className="text-sm text-gray-500">{message}</p><Button size="lg" className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700" asChild><Link href={listingLink}>Return to Premium Listings</Link></Button></div>}
  </div>;
}

export default function PremiumListingPaymentCallbackPage() {
  return <Suspense fallback={<div className="mx-auto max-w-md space-y-3 py-16 text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" /><h1 className="text-lg font-bold text-gray-900 dark:text-white">Preparing payment verification...</h1></div>}><PremiumListingPaymentCallbackContent /></Suspense>;
}
