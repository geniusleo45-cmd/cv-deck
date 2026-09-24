import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = request.nextUrl.searchParams.get("query")?.trim() || "";
  if (query.length < 2) return NextResponse.json([]);
  const contains = { contains: query, mode: "insensitive" as const };
  const contacts = await prisma.user.findMany({
    where: { id: { not: currentUser.id }, OR: [
      { name: contains }, { email: contains }, { bio: contains },
      { vendorProfile: { is: { OR: [{ businessName: contains }, { officeAddress: contains }, { phone: contains }] } } },
      { recruiterProfile: { is: { OR: [{ companyName: contains }, { industry: contains }, { website: contains }] } } },
    ] },
    select: { id: true, name: true, email: true, role: true, avatar: true, vendorProfile: { select: { businessName: true } }, recruiterProfile: { select: { companyName: true, industry: true } } },
    orderBy: { name: "asc" }, take: 12,
  });
  return NextResponse.json(contacts);
}
