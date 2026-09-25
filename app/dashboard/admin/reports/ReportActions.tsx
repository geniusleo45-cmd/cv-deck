"use client";

import { useState } from "react";
import { CheckCircle, Eye, EyeOff, XCircle } from "lucide-react";

export function ReportActions({ id, initialStatus, targetType, initialProductStatus, initialVendorStatus }: { id: string; initialStatus: string; targetType: "PRODUCT" | "VENDOR"; initialProductStatus?: string; initialVendorStatus?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [productStatus, setProductStatus] = useState(initialProductStatus);
  const [vendorStatus, setVendorStatus] = useState(initialVendorStatus);
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

  async function moderate(action: "HIDE_PRODUCT" | "RESTORE_PRODUCT" | "SUSPEND_VENDOR" | "RESTORE_VENDOR") {
    const description = action === "HIDE_PRODUCT" ? "hide this listing from the marketplace" : action === "RESTORE_PRODUCT" ? "restore this listing to the marketplace" : action === "SUSPEND_VENDOR" ? "pause this shop and hide its public listings" : "restore this shop to the marketplace";
    if (!window.confirm(`Are you sure you want to ${description}?`)) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/reports", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (response.ok) {
        setStatus(data.status);
        setProductStatus(data.productStatus);
        setVendorStatus(data.vendorStatus);
      }
    } finally {
      setSaving(false);
    }
  }

  const canRestore = targetType === "PRODUCT" && productStatus === "INACTIVE";
  const canHide = targetType === "PRODUCT" && productStatus === "ACTIVE";
  const canSuspendVendor = targetType === "VENDOR" && vendorStatus === "VERIFIED";
  const canRestoreVendor = targetType === "VENDOR" && vendorStatus === "REJECTED";

  return <div className="flex min-w-36 flex-wrap items-center gap-2"><span className="text-xs font-bold">{status}</span>{canHide && <button type="button" disabled={saving} onClick={() => moderate("HIDE_PRODUCT")} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-50" aria-label="Hide reported product"><EyeOff className="h-3.5 w-3.5" /> Hide</button>}{canRestore && <button type="button" disabled={saving} onClick={() => moderate("RESTORE_PRODUCT")} className="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-1 text-xs font-bold text-emerald-700 disabled:opacity-50" aria-label="Restore reported product"><Eye className="h-3.5 w-3.5" /> Restore</button>}{canSuspendVendor && <button type="button" disabled={saving} onClick={() => moderate("SUSPEND_VENDOR")} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-50" aria-label="Pause reported vendor"><EyeOff className="h-3.5 w-3.5" /> Pause shop</button>}{canRestoreVendor && <button type="button" disabled={saving} onClick={() => moderate("RESTORE_VENDOR")} className="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-1 text-xs font-bold text-emerald-700 disabled:opacity-50" aria-label="Restore reported vendor"><Eye className="h-3.5 w-3.5" /> Restore shop</button>}{status === "PENDING" && <><button type="button" disabled={saving} onClick={() => updateStatus("REVIEWED")} className="rounded border border-emerald-200 p-1 text-emerald-700 disabled:opacity-50" aria-label="Mark reviewed"><CheckCircle className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => updateStatus("DISMISSED")} className="rounded border border-gray-200 p-1 text-gray-600 disabled:opacity-50" aria-label="Dismiss report"><XCircle className="h-4 w-4" /></button></>}</div>;
}
