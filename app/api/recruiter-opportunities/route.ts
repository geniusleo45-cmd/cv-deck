import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { opportunitySchema } from "@/lib/recruiterOpportunities";

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const owner = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true, recruiterProfile: { select: { companyName: true } } } });
  if (owner?.role !== "RECRUITER") return NextResponse.json({ error: "Recruiter access required." }, { status: 403 });
  if (!owner.recruiterProfile?.companyName.trim()) return NextResponse.json({ error: "Complete your company profile before publishing." }, { status: 400 });
  const input = opportunitySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "Check your listing details." }, { status: 400 });
  const { kind, title, description, location, terms, quantity, closesAt } = input.data;
  const opportunity = await prisma.recruiterOpportunity.create({ data: {
    ownerId: session.id, kind, title, description, location, terms: terms || null,
    quantity: kind === "PROCUREMENT" ? quantity : null, closesAt: new Date(closesAt),
  }, select: { id: true } });
  return NextResponse.json(opportunity, { status: 201 });
}
