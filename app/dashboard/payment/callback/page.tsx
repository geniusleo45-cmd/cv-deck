"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") === "paystack" ? "PAYSTACK" : "FLUTTERWAVE";
  const reference = provider === "PAYSTACK" ? (searchParams.get("reference") || searchParams.get("trxref")) : searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");
  const [state, setState] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    if (!reference || (provider === "FLUTTERWAVE" && !transactionId)) {
      setMessage(`${provider === "PAYSTACK" ? "Paystack" : "Flutterwave"} did not return the payment details needed for verification.`);
      setState("failed");
      return;
    }
    const verificationUrl = provider === "PAYSTACK"
      ? `/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`
      : `/api/payments/flutterwave/verify?reference=${encodeURIComponent(reference)}&transactionId=${encodeURIComponent(transactionId!)}`;
    fetch(verificationUrl)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment could not be verified.");
        setState("success");
        setMessage("Your payment is confirmed. The vendor can now process your order.");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Payment could not be verified.");
        setState("failed");
      });
  }, [provider, reference, transactionId]);

  return <div className="mx-auto max-w-md py-16 text-center space-y-6">
    {state === "verifying" && <div className="space-y-3"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><h1 className="text-lg font-bold text-gray-900 dark:text-white">Verifying payment...</h1><p className="text-xs text-gray-500">Please wait while we confirm your {provider === "PAYSTACK" ? "Paystack" : "Flutterwave"} transaction.</p></div>}
    {state === "success" && <div className="rounded-3xl border bg-white dark:bg-gray-900 p-8 shadow-xl space-y-4"><CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" /><h1 className="text-2xl font-black text-gray-900 dark:text-white">Payment successful!</h1><p className="text-xs text-emerald-700 dark:text-emerald-300">{message}</p><Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold" asChild><Link href="/dashboard/orders">View my orders</Link></Button></div>}
    {state === "failed" && <div className="rounded-3xl border bg-white dark:bg-gray-900 p-8 shadow-xl space-y-4"><AlertCircle className="h-16 w-16 text-red-500 mx-auto" /><h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment verification failed</h1><p className="text-xs text-gray-500">{message}</p><Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold" asChild><Link href="/dashboard/orders">View my orders</Link></Button></div>}
  </div>;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-16 text-center space-y-3">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Preparing payment verification...</h1>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
