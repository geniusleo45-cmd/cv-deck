import Link from "next/link";
import { ExternalLink, Flag } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ReportActions } from "./ReportActions";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; target?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const status = ["PENDING", "REVIEWED", "DISMISSED"].includes(query.status || "") ? query.status! : "ALL";
  const target = ["PRODUCT", "VENDOR"].includes(query.target || "") ? query.target! : "ALL";
  const where: any = { ...(status !== "ALL" ? { status } : {}), ...(target !== "ALL" ? { targetType: target } : {}) };

  const reports = await prisma.report.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const productIds = reports.filter((report) => report.targetType === "PRODUCT").map((report) => report.targetId);
  const vendorIds = reports.filter((report) => report.targetType === "VENDOR").map((report) => report.targetId);
  const [products, vendors] = await Promise.all([
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, status: true } }) : [],
    vendorIds.length ? prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, businessName: true, status: true } }) : [],
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const filterHref = (nextStatus = status, nextTarget = target) => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextTarget !== "ALL") params.set("target", nextTarget);
    const value = params.toString();
    return `/dashboard/admin/reports${value ? `?${value}` : ""}`;
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><Flag className="h-6 w-6 text-red-600" /> Marketplace reports</h1>
        <p className="mt-1 text-sm text-gray-500">Open the reported listing or storefront, then record the outcome.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["ALL", "PENDING", "REVIEWED", "DISMISSED"].map((item) => <Link key={item} href={filterHref(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === item ? "bg-blue-600 text-white" : "border text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>{item === "ALL" ? "All statuses" : item[0] + item.slice(1).toLowerCase()}</Link>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["ALL", "PRODUCT", "VENDOR"].map((item) => <Link key={item} href={filterHref(status, item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${target === item ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "border text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>{item === "ALL" ? "All targets" : item[0] + item.slice(1).toLowerCase() + " reports"}</Link>)}
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs text-gray-500"><th className="p-4">Reporter</th><th>Reported item</th><th>Reason</th><th className="pr-4">Status</th></tr></thead>
          <tbody>{reports.map((report) => {
            const product = report.targetType === "PRODUCT" ? productById.get(report.targetId) : null;
            const vendor = report.targetType === "VENDOR" ? vendorById.get(report.targetId) : null;
            const href = product ? `/dashboard/marketplace/${product.id}` : vendor ? `/vendors/${vendor.id}` : null;
            const label = product?.name || vendor?.businessName || "Removed marketplace item";
            return <tr key={report.id} className="border-b align-top last:border-0"><td className="p-4"><p className="font-semibold">{report.user.name || "CV Deck user"}</p><p className="text-xs text-gray-500">{report.user.email}</p></td><td className="py-4 pr-4"><p className="text-xs font-bold text-gray-500">{report.targetType}</p>{href ? <Link href={href} className="mt-1 inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">{label}<ExternalLink className="h-3.5 w-3.5" /></Link> : <p className="mt-1 text-gray-500">{label}</p>}{product && <p className={`mt-1 text-[10px] font-bold ${product.status === "ACTIVE" ? "text-emerald-600" : "text-amber-600"}`}>{product.status}</p>}{vendor && <p className={`mt-1 text-[10px] font-bold ${vendor.status === "VERIFIED" ? "text-emerald-600" : "text-amber-600"}`}>{vendor.status}</p>}</td><td className="max-w-sm py-4 pr-4">{report.reason}</td><td className="pr-4 pt-4"><ReportActions id={report.id} initialStatus={report.status} targetType={report.targetType} initialProductStatus={product?.status} initialVendorStatus={vendor?.status} /></td></tr>;
          })}</tbody>
        </table>
        {!reports.length && <p className="p-8 text-center text-sm text-gray-500">No reports yet.</p>}
      </div>
    </section>
  );
}
