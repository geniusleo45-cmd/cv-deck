"use client";

import { useState } from "react";

export function ReviewReplyForm({ reviewId, initialReply }: { reviewId: string; initialReply?: string | null }) {
  const [reply, setReply] = useState(initialReply || "");
  const [savedReply, setSavedReply] = useState(initialReply || "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveReply() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, reply }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save reply.");
      setSavedReply(data.vendorReply);
      setReply(data.vendorReply);
      setMessage("Reply published");
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reply.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <div className="mt-3 space-y-2">{savedReply && <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-800/50"><p className="text-xs font-bold text-gray-700 dark:text-gray-200">Public vendor reply</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{savedReply}</p></div>}<p role="status" className="text-xs text-blue-600">{message}</p><button type="button" onClick={() => { setReply(savedReply); setMessage(""); setOpen(true); }} className="text-xs font-bold text-blue-600 hover:underline">{savedReply ? "Edit reply" : "Reply publicly"}</button></div>;
  return <div className="mt-3 rounded-xl border bg-gray-50 p-3 dark:bg-gray-800/50"><label className="block text-xs font-bold text-gray-700 dark:text-gray-200">Public vendor reply<textarea disabled={saving} value={reply} onChange={(event) => setReply(event.target.value)} minLength={3} maxLength={1000} className="mt-1 min-h-20 w-full rounded border bg-white p-2 text-xs font-normal dark:bg-gray-900" placeholder="Thank the customer or address their feedback." /></label><div className="mt-2 flex items-center justify-between gap-3"><span role="status" className="text-[11px] font-semibold text-blue-600">{message}</span><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => { setReply(savedReply); setMessage(""); setOpen(false); }} className="text-xs font-bold text-gray-500 disabled:opacity-50">Cancel</button><button type="button" disabled={saving || reply.trim().length < 3} onClick={saveReply} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Publishing..." : savedReply ? "Update reply" : "Publish reply"}</button></div></div></div>;
}
