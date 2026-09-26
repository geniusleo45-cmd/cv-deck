"use client";

import { useState } from "react";
import { HelpCircle, Send } from "lucide-react";

const reasons = [
  ["ITEM_NOT_RECEIVED", "Item not received"],
  ["ITEM_NOT_AS_DESCRIBED", "Item not as described"],
  ["DAMAGED_OR_FAULTY", "Damaged or faulty item"],
  ["OTHER", "Other issue"],
] as const;

export function RequestSupportButton({ orderId, disputeStatus }: { orderId: string; disputeStatus?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("ITEM_NOT_RECEIVED");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (disputeStatus || submitted) return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Support case: {(disputeStatus || "OPEN").replace("_", " ")}</span>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, reason, details }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit request.");
      setMessage("Support request submitted. Our team will review it.");
      setOpen(false);
      setSubmitted(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit request.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="text-right">{!open ? <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-blue-600 dark:text-gray-300"><HelpCircle className="h-3.5 w-3.5" /> Request order support</button> : <form onSubmit={submit} className="mt-2 max-w-md rounded-xl border bg-gray-50 p-3 text-left dark:bg-gray-800/50"><label className="block text-xs font-bold">Issue<select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-1 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900">{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-2 block text-xs font-bold">What happened?<textarea value={details} onChange={(event) => setDetails(event.target.value)} minLength={10} maxLength={1200} required className="mt-1 min-h-20 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900" placeholder="Describe the issue and any details that can help us investigate." /></label><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-gray-500">Cancel</button><button disabled={saving} className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {saving ? "Sending..." : "Send request"}</button></div></form>}{message && <p className="mt-2 text-xs font-semibold text-blue-600">{message}</p>}</div>;
}
