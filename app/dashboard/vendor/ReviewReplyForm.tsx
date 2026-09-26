"use client";

import { useState } from "react";

export function ReviewReplyForm({ reviewId, initialReply }: { reviewId: string; initialReply?: string | null }) {
  const [reply, setReply] = useState(initialReply || "");
  const [open, setOpen] = useState(Boolean(initialReply));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveReply() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, reply }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save reply.");
      setMessage("Reply published");
      setOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reply.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-blue-600 hover:underline">Reply publicly</button>;
  return <div className="mt-3 rounded-xl border bg-gray-50 p-3 dark:bg-gray-800/50"><label className="block text-xs font-bold text-gray-700 dark:text-gray-200">Public vendor reply<textarea value={reply} onChange={(event) => setReply(event.target.value)} minLength={3} maxLength={1000} className="mt-1 min-h-20 w-full rounded border bg-white p-2 text-xs font-normal dark:bg-gray-900" placeholder="Thank the customer or address their feedback." /></label><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-blue-600">{message}</span><div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-gray-500">Cancel</button><button type="button" disabled={saving || reply.trim().length < 3} onClick={saveReply} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Publishing..." : initialReply ? "Update reply" : "Publish reply"}</button></div></div></div>;
}
