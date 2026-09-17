"use client";

import { useState } from "react";

export function CancelPendingOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cancelOrder = async () => {
    if (!window.confirm("Cancel this unpaid order? Reserved stock will be returned to the marketplace.")) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to cancel this order.");
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to cancel this order.");
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 text-right">
      <button
        type="button"
        onClick={cancelOrder}
        disabled={loading}
        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
      >
        {loading ? "Cancelling..." : "Cancel unpaid order"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
