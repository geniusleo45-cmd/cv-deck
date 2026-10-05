"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpCircle, Send } from "lucide-react";

const reasons = [
  ["PAYMENT_COMPLETED_NOT_ACTIVATED", "Payment completed, but listing did not activate"],
  ["CHECKOUT_LINK_UNAVAILABLE", "I cannot reopen the checkout link"],
  ["PAYMENT_PROVIDER_ERROR", "The payment provider showed an error"],
  ["OTHER", "Other payment issue"],
] as const;

const supportStatusClasses: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

type SupportRequest = {
  status: string;
  adminNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function PremiumListingPaymentSupportButton({
  campaignId,
  initialSupportRequest,
  canCreate = true,
}: {
  campaignId: string;
  initialSupportRequest?: SupportRequest | null;
  canCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("PAYMENT_COMPLETED_NOT_ACTIVATED");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [supportRequest, setSupportRequest] = useState<SupportRequest | null>(initialSupportRequest || null);

  if (supportRequest) {
    return (
      <div className="min-w-52 space-y-2 text-right">
        <Link href={`/dashboard/vendor/advertise/${encodeURIComponent(campaignId)}/support`} className="block text-xs font-bold text-blue-600 hover:underline">View support request</Link>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${supportStatusClasses[supportRequest.status] || supportStatusClasses.OPEN}`}>
          Payment support: {supportRequest.status.replaceAll("_", " ")}
        </span>
        {supportRequest.adminNote && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-left text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            <p className="font-bold">Support team update</p>
            <p className="mt-1 leading-relaxed">{supportRequest.adminNote}</p>
            {supportRequest.updatedAt && <p className="mt-2 text-[11px] text-blue-700/80 dark:text-blue-200/80">Updated {new Date(supportRequest.updatedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>}
          </div>
        )}
      </div>
    );
  }

  if (!canCreate) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/ad-campaigns/${encodeURIComponent(campaignId)}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit the payment-reconciliation request.");
      setSupportRequest({
        status: data.status,
        adminNote: data.adminNote,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the payment-reconciliation request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="text-right">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-blue-600 dark:text-gray-300">
          <HelpCircle className="h-3.5 w-3.5" /> Payment issue?
        </button>
      ) : (
        <form onSubmit={submit} className="max-w-md rounded-xl border bg-gray-50 p-3 text-left dark:bg-gray-800/50">
          <p className="text-xs font-bold">Request payment support</p>
          <p className="mt-1 text-[11px] text-gray-500">This starts a manual reconciliation request. It does not cancel or refund a provider payment.</p>
          <label className="mt-3 block text-xs font-bold">Issue
            <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-1 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900">
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="mt-2 block text-xs font-bold">What happened?
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} minLength={10} maxLength={1200} required className="mt-1 min-h-20 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900" placeholder="Include the payment result, time, and any provider message that can help us investigate." />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-gray-500">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {saving ? "Sending..." : "Send request"}</button>
          </div>
        </form>
      )}
      {message && <p className="mt-2 max-w-md text-xs font-semibold text-red-600">{message}</p>}
    </div>
  );
}
