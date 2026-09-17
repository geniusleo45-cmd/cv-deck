import { Navbar } from "@/components/layout/Navbar";
import { CartProvider } from "@/components/cart/CartProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, ShieldCheck, Store, MessageSquare, ArrowRight } from "lucide-react";

export default function PublicRecruitersPage() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50/40 dark:bg-gray-950 flex flex-col">
        <Navbar />

        <div className="container mx-auto px-4 sm:px-6 py-12 space-y-8 flex-1 max-w-4xl">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-4 py-1 text-xs font-bold uppercase">
              <Briefcase className="h-4 w-4" /> Recruiter & Procurement Hub
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white">
              Enterprise Procurement & Tech Talent Sourcing
            </h1>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              Are you looking for bulk IT hardware, corporate laptop fleets, enterprise networking gear, or certified Computer Village technicians? Register as a Recruiter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="rounded-3xl border bg-white dark:bg-gray-900 p-8 shadow-sm space-y-4">
              <ShieldCheck className="h-10 w-10 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Hardware Sourcing</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Connect directly with verified importers on Pepple Street and Otigba Street for bulk orders of MacBooks, Dell XPS workstations, and Cisco enterprise networking gear.
              </p>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2" asChild>
                <Link href="/register?role=RECRUITER">
                  Register as Recruiter <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-3xl border bg-white dark:bg-gray-900 p-8 shadow-sm space-y-4">
              <Store className="h-10 w-10 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Technician & Service Outreach</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Recruit certified motherboard repair technicians, smartphone diagnostic experts, and hardware repair shops for contract or permanent placements.
              </p>
              <Button size="sm" variant="outline" asChild className="gap-2">
                <Link href="/login">Log In to Portal</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CartProvider>
  );
}
