"use client";

import { useState } from "react";

const statuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"] as const;

export function DisputeActions({ id, initialStatus, initialNote }: { id: string; initialStatus: string; initialNote?: string | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [adminNote, setAdminNote] = useState(initialNote || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/disputes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, adminNote }) });
      const data = await response.json();
      setMessage(response.ok ? "Updated" : data.error || "Unable to update");
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-w-56 space-y-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded border bg-white p-2 text-xs dark:bg-gray-900">{statuses.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={1200} placeholder="Internal note or resolution shared with buyer" className="min-h-16 w-full rounded border bg-white p-2 text-xs dark:bg-gray-900" /><div className="flex items-center justify-between"><span className="text-[10px] text-gray-500">{message}</span><button type="button" disabled={saving} onClick={save} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button></div></div>;
}
