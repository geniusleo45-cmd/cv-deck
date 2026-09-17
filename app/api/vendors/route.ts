import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
