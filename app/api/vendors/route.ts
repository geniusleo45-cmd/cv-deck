import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { vendorUpdateSchema } from "@/lib/validations/vendor";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const status = searchParams.get("status");

    const where: any = {};

    if (query) {
      where.OR = [
        { businessName: { contains: query, mode: "insensitive" } },
        { officeAddress: { contains: query, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true, avatar: true } },
        _count: { select: { products: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vendors);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "VENDOR" && user.role !== "ADMIN")) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
    const input = vendorUpdateSchema.parse(await request.json());
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (!vendor) return NextResponse.json({ error: "Vendor profile not found." }, { status: 404 });
    return NextResponse.json(await prisma.vendor.update({ where: { id: vendor.id }, data: input }));
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Unable to update business profile." }, { status: 500 });
  }
}
