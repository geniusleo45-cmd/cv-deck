"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelPremiumListingButton({ campaignId, onCancelled, disabled = false }: { campaignId: string; onCancelled?: () => void; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="space-y-2">
    <button type="button" disabled={busy || disabled} className="rounded-lg border px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50" onClick={async () => {
      if (!window.confirm("Cancel this unpaid Premium Listing? You can choose another plan afterwards. No refund is issued.")) return;
      setBusy(true); setError("");
      try {
        const response = await fetch("/api/ad-campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: campaignId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to cancel listing.");
        onCancelled?.(); router.refresh();
      } catch (error) { setError(error instanceof Error ? error.message : "Unable to cancel listing."); }
      finally { setBusy(false); }
    }}>{busy ? "Cancelling…" : onCancelled ? "Cancel & change plan" : "Cancel unpaid listing"}</button>
    {error && <p role="alert" className="max-w-sm text-xs text-red-600">{error}</p>}
  </div>;
}
