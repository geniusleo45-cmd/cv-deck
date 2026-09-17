import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShoppingBag, CheckCircle, Clock, Truck, CreditCard, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayOrderButton } from "@/components/payments/PayOrderButton";
import { CancelPendingOrderButton } from "@/components/payments/CancelPendingOrderButton";

export default async function OrdersPage() {
  const user = await getCurrentUser();

  let orders: any[] = [];

  if (user?.role === "ADMIN") {
    orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: { include: { vendor: true } } } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (user?.role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (vendor) {
      orders = await prisma.order.findMany({
        where: {
          items: {
            some: { product: { vendorId: vendor.id } },
          },
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: {
            where: { product: { vendorId: vendor.id } },
            include: { product: true },
          },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }
  } else {
    orders = await prisma.order.findMany({
      where: { userId: user?.id },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: { include: { vendor: true } } } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs"><CheckCircle className="h-3.5 w-3.5" /> Delivered</span>;
      case "SHIPPED":
        return <span className="flex items-center gap-1 bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs"><Truck className="h-3.5 w-3.5" /> In Transit</span>;
      case "PROCESSING":
        return <span className="flex items-center gap-1 bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full text-xs"><Clock className="h-3.5 w-3.5" /> Processing</span>;
      default:
        return <span className="flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs"><Clock className="h-3.5 w-3.5" /> Pending Payment</span>;
    }
  };

  const fulfillmentSteps = [
    { key: "PROCESSING", label: "Processing" },
    { key: "SHIPPED", label: "Shipped" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  const paymentLabel = (status: string) => {
    if (status === "SUCCESS") return "Paid & Verified";
    if (status === "FAILED") return "Payment failed";
    return "Payment pending";
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-blue-600" /> Order History & Tracking
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Monitor your Computer Village orders, status updates, and payment details.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border rounded-2xl p-8 space-y-3">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Orders Found</h3>
          <p className="text-xs text-gray-500">
            You haven&apos;t placed or received any orders yet.
          </p>
          <Button size="sm" className="bg-blue-600 text-white font-bold" asChild>
            <Link href="/dashboard/marketplace">Explore Marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-base text-gray-900 dark:text-white">#{order.orderNumber}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} • Customer: <span className="font-semibold text-gray-800 dark:text-gray-200">{order.user.name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Total Amount</span>
                  <span className="text-xl font-black text-blue-600">₦{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y">
                {order.items.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{item.product.name}</h4>
                      <p className="text-gray-500 mt-0.5">
                        Qty: {item.quantity} x ₦{item.price.toLocaleString()} • Vendor: <span className="font-semibold">{item.product.vendor?.businessName || "Computer Village Shop"}</span>
                      </p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₦{(item.quantity * item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {order.status !== "CANCELLED" && order.payment?.status === "SUCCESS" && (
                <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-800/40">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Fulfillment progress</p>
                  <ol className="grid grid-cols-3 gap-2">
                    {fulfillmentSteps.map((step, index) => {
                      const currentIndex = fulfillmentSteps.findIndex((item) => item.key === order.status);
                      const complete = currentIndex >= index;
                      return (
                        <li key={step.key} className="flex min-w-0 flex-col gap-1.5 text-center">
                          <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${complete ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                            {complete ? <CheckCircle className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <span className={`text-[10px] font-semibold ${complete ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"}`}>{step.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* Payment Details footer */}
              {order.payment && (
                <div className={`pt-3 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs p-3 rounded-xl ${order.payment.status === "SUCCESS" ? "bg-emerald-50/60 text-gray-500 dark:bg-emerald-950/20" : order.payment.status === "FAILED" ? "bg-red-50/60 text-gray-500 dark:bg-red-950/20" : "bg-amber-50/60 text-gray-500 dark:bg-amber-950/20"}`}>
                  <span className="break-all">Payment Ref: <strong className="text-gray-700 dark:text-gray-300">{order.payment.reference}</strong> ({order.payment.provider})</span>
                  <span className={`flex items-center gap-1 font-bold uppercase ${order.payment.status === "SUCCESS" ? "text-emerald-600" : order.payment.status === "FAILED" ? "text-red-600" : "text-amber-700"}`}>
                    {order.payment.status === "SUCCESS" ? <CheckCircle className="h-3.5 w-3.5" /> : order.payment.status === "FAILED" ? <XCircle className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                    {paymentLabel(order.payment.status)}
                  </span>
                </div>
              )}
              {order.status === "PENDING" && order.payment?.status !== "SUCCESS" && (
                <div className="flex flex-wrap justify-end gap-2">
                  <CancelPendingOrderButton orderId={order.id} />
                  <PayOrderButton orderId={order.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
