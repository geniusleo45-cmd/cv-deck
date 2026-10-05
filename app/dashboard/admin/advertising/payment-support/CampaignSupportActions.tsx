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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ad-campaign-support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote }),
      });
      const data = await response.json();
      setMessage(response.ok ? "Updated and shared with vendor" : data.error || "Unable to update");
      if (response.ok) router.refresh();
    } catch {
      setMessage("Unable to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-60 space-y-2">
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded border bg-white p-2 text-xs dark:bg-gray-900">
        {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
      </select>
      <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={1200} placeholder="Resolution or next step shared with the vendor" className="min-h-20 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-500" role="status">{message}</span>
        <button type="button" disabled={saving} onClick={save} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
}
