import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/rbac";
import { NewProductForm } from "./NewProductForm";
export default async function NewProductPage() { await requireVendor(); const categories = await prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }); return <section className="space-y-6"><div><h1 className="text-2xl font-black">Add new product</h1><p className="mt-1 text-sm text-gray-500">Create an inventory listing for your Computer Village shop.</p></div><NewProductForm categories={categories} /></section>; }
