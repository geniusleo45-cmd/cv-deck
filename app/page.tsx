import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { CartProvider } from "@/components/cart/CartProvider";
import { prisma } from "@/lib/prisma";
import {
  Laptop,
  ShieldCheck,
  Store,
  Briefcase,
  ArrowRight,
  ShoppingBag,
  MapPin,
  CheckCircle,
  TrendingUp,
  Search,
} from "lucide-react";

// The homepage shows live marketplace data, so it must not query Neon during Vercel's build-time prerender.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featuredProducts, verifiedVendorsCount] = await Promise.all([
    prisma.category.findMany({ take: 6 }),
    prisma.product.findMany({
      take: 6,
      include: { category: true, vendor: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.count({ where: { status: "VERIFIED" } }),
  ]);

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50/40 dark:bg-gray-950 flex flex-col">
        <Navbar />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 py-20 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e40af15_1px,transparent_1px),linear-gradient(to_bottom,#1e40af15_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center space-y-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-300">
              <ShieldCheck className="h-4 w-4" /> Official Computer Village Ikeja Marketplace
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              Buy, Sell & Source Tech Directly from <span className="text-blue-400">Computer Village</span>
            </h1>

            <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Nigeria&apos;s largest electronics hub, digitized. Connect directly with verified gadget vendors, hardware repair experts, and corporate tech recruiters.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 text-base rounded-2xl shadow-xl shadow-blue-500/30 gap-2" asChild>
                <Link href="/dashboard/marketplace">
                  <Store className="h-5 w-5" /> Explore Marketplace <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-700 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-6 text-base rounded-2xl gap-2" asChild>
                <Link href="/register">
                  <Briefcase className="h-5 w-5" /> Join as Vendor or Recruiter
                </Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-800/80 max-w-2xl mx-auto text-center">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-blue-400">100%</span>
                <p className="text-xs text-gray-400">Escrow Protected</p>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-blue-400">{verifiedVendorsCount}+</span>
                <p className="text-xs text-gray-400">Verified Ikeja Shops</p>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-blue-400">4 Roles</span>
                <p className="text-xs text-gray-400">Shopper, Vendor, Recruiter, Admin</p>
              </div>
            </div>
          </div>
        </section>

        {/* Marketplace Categories Section */}
        <section className="py-16 bg-white dark:bg-gray-900 border-b">
          <div className="container mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                Popular Computer Village Categories
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Browse laptops, MacBooks, smartphones, network equipment, component repairs, and gaming rigs.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/dashboard/marketplace?categoryId=${cat.id}`}
                  className="group p-5 rounded-2xl border bg-gray-50/50 dark:bg-gray-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all text-center space-y-2"
                >
                  <div className="h-10 w-10 mx-auto rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Verified Vendors Callout Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center rounded-3xl bg-blue-900 p-8 sm:p-12 text-white shadow-xl">
              <div className="space-y-4">
                <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 text-xs font-bold uppercase">
                  For Computer Village Merchants
                </span>
                <h2 className="text-3xl font-black">
                  Are You a Computer Village Vendor?
                </h2>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Digitize your store on Pepple Street, Otigba Street, or Medical Road. Receive verified shop badges, process online orders with escrow payment protection, and respond to corporate recruiters.
                </p>
                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-bold gap-2" asChild>
                  <Link href="/register">
                    Register Your Shop <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/10 backdrop-blur border border-white/10 space-y-2">
                  <ShieldCheck className="h-8 w-8 text-blue-400" />
                  <h4 className="font-bold text-base">Verified Badge</h4>
                  <p className="text-xs text-blue-200">Physical shop audit by CV Deck team.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/10 backdrop-blur border border-white/10 space-y-2">
                  <TrendingUp className="h-8 w-8 text-emerald-400" />
                  <h4 className="font-bold text-base">Nationwide Reach</h4>
                  <p className="text-xs text-blue-200">Sell to buyers across Nigeria.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t bg-white dark:bg-gray-950 py-8 text-xs text-gray-500">
          <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-gray-900 dark:text-white">CV Deck – Computer Village Marketplace</span>
            </div>
            <p>© 2026 CV Deck. Computer Village Ikeja, Lagos, Nigeria.</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
