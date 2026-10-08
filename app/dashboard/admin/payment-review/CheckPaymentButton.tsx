"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckPaymentButton({ id, kind }: { id: string; kind: "order" | "campaign" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function check() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/payment-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }) });
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error || "Unable to verify payment.");
      if (response.ok) router.refresh();
    } catch { setMessage("Unable to verify payment. Retry the same reference later."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2"><p className="text-xs text-gray-500">A verified payment will be reconciled. No new charge or automatic refund.</p><button type="button" disabled={busy} onClick={check} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Checking..." : "Check Paystack status"}</button><p role="status" className="text-sm">{message}</p></div>;
}
