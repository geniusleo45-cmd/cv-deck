"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ResolutionEditor({ targetId, kind }: { targetId: string; kind: "order" | "campaign" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const attempt = useRef<{ payload: string; requestId: string } | null>(null);
  return <div className="mt-3">
    <button type="button" className="text-sm font-bold underline" onClick={() => setOpen(!open)} disabled={busy}>{open ? "Close resolution editor" : "Record review / resolution"}</button>
    {open && <form className="mt-3 space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      const data = new FormData(event.currentTarget);
      const payload = JSON.stringify({ targetId, kind, status: data.get("status"), note: data.get("note"), externalReference: data.get("externalReference") });
      if (!attempt.current || attempt.current.payload !== payload) attempt.current = { payload, requestId: crypto.randomUUID() };
      setBusy(true); setMessage("");
      try {
        const response = await fetch("/api/admin/payment-review/resolutions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: attempt.current.requestId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not save resolution.");
        setOpen(false); attempt.current = null; setMessage("Review saved. No payment or order status was changed."); router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed; please retry."); }
      finally { setBusy(false); }
    }}>
      <p className="text-xs text-gray-500">Internal audit record only. This does not issue or independently verify a refund, activate a campaign, or reopen an order. Do not include card details or secrets.</p>
      <label className="block text-sm">Review status<select name="status" disabled={busy} className="mt-1 block w-full rounded border bg-background p-2">
        <option value="IN_REVIEW">In review</option><option value="OPEN">Reopened</option><option value="RESOLVED">Resolved — explanation required</option><option value="REFUND_RECORDED">External refund recorded by Admin</option>
      </select></label>
      <label className="block text-sm">Resolution note<textarea name="note" required minLength={10} maxLength={2000} disabled={busy} className="mt-1 block w-full rounded border bg-background p-2" /></label>
      <label className="block text-sm">External provider refund / support reference<input name="externalReference" maxLength={200} disabled={busy} className="mt-1 block w-full rounded border bg-background p-2" /></label>
      <button disabled={busy} className="rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white">{busy ? "Saving…" : "Save review"}</button>
    </form>}
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </div>;
}
