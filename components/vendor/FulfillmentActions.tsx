"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Truck } from "lucide-react";

export function FulfillmentActions({ orderId, status }: { orderId: string; status: "PROCESSING" | "SHIPPED" }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const nextStatus = status === "PROCESSING" ? "SHIPPED" : "DELIVERED";
  const label = status === "PROCESSING" ? "Mark as shipped" : "Mark as delivered";
  const Icon = status === "PROCESSING" ? Truck : CheckCircle;

  async function updateStatus() {
    setError(""); setIsUpdating(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the order.");
      window.location.reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update the order.");
      setIsUpdating(false);
    }
  }

  return <div className="text-right">{status === "PROCESSING" && <p className="mb-2 text-xs text-gray-500">A CV Deck tracking number will be generated automatically.</p>}<button type="button" onClick={updateStatus} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Icon className="h-4 w-4" />{isUpdating ? "Updating..." : label}</button>{error && <p className="mt-2 text-xs text-red-600">{error}</p>}</div>;
}
