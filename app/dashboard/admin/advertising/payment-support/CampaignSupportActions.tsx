"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"] as const;

export function CampaignSupportActions({
  id,
  initialStatus,
  initialNote,
}: {
  id: string;
  initialStatus: string;
  initialNote?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [adminNote, setAdminNote] = useState(initialNote || "");
  const [saved, setSaved] = useState({ status: initialStatus, adminNote: initialNote || "" });
  const [editing, setEditing] = useState(!initialNote && initialStatus !== "RESOLVED" && initialStatus !== "REJECTED");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ad-campaign-support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update");
      setSaved({ status: data.status, adminNote: data.adminNote || "" });
      setStatus(data.status);
      setAdminNote(data.adminNote || "");
      setMessage("Updated and shared with vendor");
      setEditing(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) return (
    <div className="min-w-60 space-y-2">
      <p className="text-xs font-bold">{saved.status.replaceAll("_", " ")}</p>
      <p className="whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">{saved.adminNote || "No resolution note added."}</p>
      <p role="status" className="text-[10px] text-gray-500">{message}</p>
      <button type="button" onClick={() => { setStatus(saved.status); setAdminNote(saved.adminNote); setMessage(""); setEditing(true); }} className="text-xs font-bold text-blue-600 hover:underline">Edit resolution</button>
    </div>
  );

  return (
    <div className="min-w-60 space-y-2">
      <select aria-label="Support status" disabled={saving} value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded border bg-white p-2 text-xs dark:bg-gray-900">
        {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
      </select>
      <textarea aria-label="Resolution note" disabled={saving} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={1200} placeholder="Resolution or next step shared with the vendor" className="min-h-20 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-500" role="status">{message}</span>
        <button type="button" disabled={saving} onClick={() => { setStatus(saved.status); setAdminNote(saved.adminNote); setMessage(""); setEditing(false); }} className="text-xs font-bold text-gray-500 disabled:opacity-50">Cancel</button>
        <button type="button" disabled={saving} onClick={save} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
}
