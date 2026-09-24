import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/rbac";
import { ProductEditor } from "./ProductEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireVendor();
  const { id } = await params;
  const product = await prisma.product.findFirst({ where: { id, vendor: { userId: user.id } }, select: { id: true, name: true, price: true, stock: true, status: true, images: true } });
  if (!product) notFound();
  let images: string[] = [];
  try { const parsed = JSON.parse(product.images); if (Array.isArray(parsed)) images = parsed.filter((image): image is string => typeof image === "string"); } catch {}
  return <section className="space-y-6"><div><h1 className="text-2xl font-black">Edit product</h1><p className="text-sm text-gray-500">Update this inventory listing.</p></div><ProductEditor product={{ ...product, images }} /></section>;
}
