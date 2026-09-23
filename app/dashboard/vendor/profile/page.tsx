import { requireVendor } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { VendorProfileForm } from "./VendorProfileForm";

export default async function VendorProfilePage() { const user = await requireVendor(); const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } }); if (!vendor) return <p className="rounded-xl border p-6 text-gray-500">Vendor profile not found.</p>; return <section className="space-y-6"><div><h1 className="text-2xl font-black">Business profile</h1><p className="mt-1 text-sm text-gray-500">Manage the details buyers see for your Computer Village shop.</p></div><VendorProfileForm vendor={{ businessName: vendor.businessName, officeAddress: vendor.officeAddress, phone: vendor.phone || "", businessRegNumber: vendor.businessRegNumber || "", bankDetails: vendor.bankDetails || "", logo: vendor.logo || "", banner: vendor.banner || "", status: vendor.status }} /></section>; }
