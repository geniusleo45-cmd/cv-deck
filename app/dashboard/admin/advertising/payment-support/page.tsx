import Link from "next/link";
import { ArrowLeft, CreditCard, LifeBuoy, Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CampaignSupportActions } from "./CampaignSupportActions";

const statuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"] as const;
const filters = ["ALL", ...statuses] as const;

function statusClass(status: string) {
  if (status === "OPEN") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  if (status === "UNDER_REVIEW") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  if (status === "RESOLVED") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
}

function providerLabel(provider: string | null) {
  if (provider === "PAYSTACK") return "Paystack";
  if (provider === "FLUTTERWAVE") return "Flutterwave";
  return "Provider unavailable";
}

export default async function AdCampaignPaymentSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const selectedStatus = filters.includes(query.status as (typeof filters)[number])
    ? query.status as (typeof filters)[number]
    : "OPEN";
  const supportRequests = await prisma.adCampaignSupportRequest.findMany({
    where: selectedStatus === "ALL" ? undefined : { status: selectedStatus },
    include: {
      user: { select: { name: true, email: true } },
      campaign: {
        select: {
          id: true,
          package: true,
          amount: true,
          status: true,
          paymentProvider: true,
          paymentReference: true,
          product: { select: { id: true, name: true } },
          vendor: { select: { businessName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/admin/advertising" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600"><ArrowLeft className="h-4 w-4" /> Back to Premium Listings</Link>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-black"><LifeBuoy className="h-6 w-6 text-blue-600" /> Premium Listing payment support</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Reconcile paid or interrupted Premium Listing checkouts. Updating a case never issues a refund or cancels a provider payment automatically.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"><CreditCard className="h-4 w-4" /> Manual reconciliation queue</span>
      </div>

      <nav aria-label="Payment support status" className="flex flex-wrap gap-2">
        {filters.map((status) => {
          const href = status === "ALL" ? "/dashboard/admin/advertising/payment-support?status=ALL" : `/dashboard/admin/advertising/payment-support?status=${status}`;
          return <Link key={status} href={href} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedStatus === status ? "bg-blue-600 text-white" : "border bg-white text-gray-600 hover:border-blue-300 hover:text-blue-700 dark:bg-gray-900 dark:text-gray-300"}`}>{status.replaceAll("_", " ")}</Link>;
        })}
      </nav>

      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead><tr className="border-b text-xs text-gray-500"><th className="p-4">Campaign & vendor</th><th>Payment reference</th><th>Vendor request</th><th>Timeline</th><th className="pr-4">Resolution</th></tr></thead>
          <tbody>
            {supportRequests.map((supportRequest) => (
              <tr key={supportRequest.id} className="border-b align-top last:border-0">
                <td className="p-4">
                  <Link href={`/dashboard/marketplace/${supportRequest.campaign.product.id}`} className="font-bold text-gray-900 hover:text-blue-600 hover:underline dark:text-white">{supportRequest.campaign.product.name}</Link>
                  <p className="mt-1 text-xs text-gray-500">{supportRequest.campaign.vendor.businessName}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><Megaphone className="h-3.5 w-3.5" /> {supportRequest.campaign.package.toLowerCase()} · ₦{supportRequest.campaign.amount.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] text-gray-500">Campaign: {supportRequest.campaign.status.replaceAll("_", " ")}</p>
                </td>
                <td className="py-4 pr-4 text-xs">
                  <p className="font-bold">{providerLabel(supportRequest.campaign.paymentProvider)}</p>
                  <p className="mt-1 break-all text-[10px] text-gray-500">{supportRequest.campaign.paymentReference || "No stored reference"}</p>
                </td>
                <td className="max-w-sm py-4 pr-4">
                  <p className="text-xs font-bold text-gray-500">{supportRequest.reason.replaceAll("_", " ")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{supportRequest.details}</p>
                  <p className="mt-2 text-[11px] text-gray-500">Requested by {supportRequest.user.name || supportRequest.user.email}</p>
                </td>
                <td className="py-4 pr-4 text-xs text-gray-500">
                  <p>Opened {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(supportRequest.createdAt)}</p>
                  <p className="mt-1">Updated {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(supportRequest.updatedAt)}</p>
                  <span className={`mt-3 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(supportRequest.status)}`}>{supportRequest.status.replaceAll("_", " ")}</span>
                </td>
                <td className="py-4 pr-4"><CampaignSupportActions id={supportRequest.id} initialStatus={supportRequest.status} initialNote={supportRequest.adminNote} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!supportRequests.length && <p className="p-8 text-center text-sm text-gray-500">No {selectedStatus === "ALL" ? "payment-reconciliation requests" : `${selectedStatus.toLowerCase().replaceAll("_", " ")} payment-reconciliation requests`}.</p>}
      </div>
    </section>
  );
}
