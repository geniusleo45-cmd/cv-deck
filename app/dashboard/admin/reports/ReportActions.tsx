"use client";

import { useState } from "react";
import { CheckCircle, Eye, EyeOff, XCircle } from "lucide-react";

export function ReportActions({ id, initialStatus, targetType, initialProductStatus }: { id: string; initialStatus: string; targetType: "PRODUCT" | "VENDOR"; initialProductStatus?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [productStatus, setProductStatus] = useState(initialProductStatus);
  const [saving, setSaving] = useState(false);

  async function updateStatus(next: "REVIEWED" | "DISMISSED") {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/reports", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) });
      if (response.ok) setStatus(next);
    } finally {
      setSaving(false);
    }
  }

  async function moderate(action: "HIDE_PRODUCT" | "RESTORE_PRODUCT") {
    const description = action === "HIDE_PRODUCT" ? "hide this listing from the marketplace" : "restore this listing to the marketplace";
    if (!window.confirm(`Are you sure you want to ${description}?`)) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/reports", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (response.ok) {
        setStatus(data.status);
        setProductStatus(data.productStatus);
      }
    } finally {
      setSaving(false);
    }
  }

  const canRestore = targetType === "PRODUCT" && productStatus === "INACTIVE";
  const canHide = targetType === "PRODUCT" && productStatus === "ACTIVE";

  return <div className="flex min-w-36 flex-wrap items-center gap-2"><span className="text-xs font-bold">{status}</span>{canHide && <button type="button" disabled={saving} onClick={() => moderate("HIDE_PRODUCT")} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-50" aria-label="Hide reported product"><EyeOff className="h-3.5 w-3.5" /> Hide</button>}{canRestore && <button type="button" disabled={saving} onClick={() => moderate("RESTORE_PRODUCT")} className="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-1 text-xs font-bold text-emerald-700 disabled:opacity-50" aria-label="Restore reported product"><Eye className="h-3.5 w-3.5" /> Restore</button>}{status === "PENDING" && <><button type="button" disabled={saving} onClick={() => updateStatus("REVIEWED")} className="rounded border border-emerald-200 p-1 text-emerald-700 disabled:opacity-50" aria-label="Mark reviewed"><CheckCircle className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => updateStatus("DISMISSED")} className="rounded border border-gray-200 p-1 text-gray-600 disabled:opacity-50" aria-label="Dismiss report"><XCircle className="h-4 w-4" /></button></>}</div>;
}
