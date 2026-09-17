import { Navbar } from "@/components/layout/Navbar";
import { DashboardSidebar } from "@/components/layout/Sidebar";
import { CartProvider } from "@/components/cart/CartProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-950 flex flex-col">
        <Navbar />
        <div className="container mx-auto flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:gap-6">
          <DashboardSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </CartProvider>
  );
}
