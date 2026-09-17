"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface VerificationItem {
  id: string;
  vendorId: string;
  documentType: string;
  documentUrl: string;
  status: string;
  createdAt: Date | string;
  vendor: {
    id: string;
    businessName: string;
    officeAddress: string;
    user: {
      name: string | null;
      email: string;
      phone: string | null;
    };
  };
}

export function AdminVendorReviewQueue({
  verifications,
}: {
  verifications: VerificationItem[];
}) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleDecision = async (vendorId: string, status: "APPROVED" | "REJECTED") => {
    try {
      setProcessingId(vendorId);
      const res = await fetch("/api/admin/vendors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          status,
          adminNotes: `Decision ${status.toLowerCase()} by Admin on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  if (verifications.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-gray-500 border-2 border-dashed rounded-xl">
        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-semibold text-gray-700 dark:text-gray-300">All vendor verification requests have been reviewed!</p>
      </div>
    );
  }

  return (
    <div className="divide-y border rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
      {verifications.map((v) => (
        <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {v.vendor.businessName}
              </h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                Pending Document Review
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Owner: <span className="font-semibold">{v.vendor.user.name}</span> ({v.vendor.user.email}) • Address: {v.vendor.officeAddress}
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-600 font-medium pt-1">
              <FileText className="h-3.5 w-3.5" />
              <span>Doc: {v.documentType}</span>
              <a
                href={v.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="underline flex items-center gap-1 hover:text-blue-800"
              >
                View Document <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              disabled={processingId === v.vendorId}
              onClick={() => handleDecision(v.vendorId, "APPROVED")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs"
            >
              <CheckCircle className="h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={processingId === v.vendorId}
              onClick={() => handleDecision(v.vendorId, "REJECTED")}
              className="text-red-600 hover:bg-red-50 border-red-200 font-bold gap-1 text-xs"
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
