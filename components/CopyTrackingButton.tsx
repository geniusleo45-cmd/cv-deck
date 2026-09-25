"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyTrackingButton({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <button type="button" onClick={copyReference} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline" aria-label={`Copy tracking number ${reference}`}><span className="font-mono">{reference}</span>{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>;
}
