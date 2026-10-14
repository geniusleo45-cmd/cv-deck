import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isVerifiedApplicant, responseSchema } from "@/lib/recruiterOpportunities";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const input = responseSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "Check your response." }, { status: 400 });
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: session.id }, select: { role: true, vendorProfile: { select: { status: true } }, recruiterProfile: { select: { verified: true } } } });
      if (!isVerifiedApplicant(user)) return "unverified";
      // Share the opportunity row lock with close/review operations.
      const claimed = await tx.recruiterOpportunity.updateMany({ where: { id, ownerId: { not: session.id }, status: "OPEN", closesAt: { gt: new Date() } }, data: { updatedAt: new Date() } });
      if (!claimed.count) return "unavailable";
      const listing = await tx.recruiterOpportunity.findUniqueOrThrow({ where: { id } });
      if (listing.kind === "PROCUREMENT" && input.data.quoteAmount === undefined) return "missing-quote";
      const response = await tx.opportunityResponse.create({ data: { opportunityId: id, applicantId: session.id, message: input.data.message, quoteAmount: listing.kind === "PROCUREMENT" ? input.data.quoteAmount : null }, select: { id: true } });
      await tx.notification.create({ data: { userId: listing.ownerId, type: "SYSTEM", title: listing.kind === "JOB" ? "New job application" : "New procurement quotation", message: `A verified account responded to ${listing.title}.`, link: `/dashboard/opportunities/${id}` } });
      return response;
    });
    if (outcome === "unverified") return NextResponse.json({ error: "Admin verification is required before applying or quoting." }, { status: 403 });
    if (outcome === "unavailable") return NextResponse.json({ error: "This opportunity is closed, expired, unavailable, or belongs to you." }, { status: 409 });
    if (outcome === "missing-quote") return NextResponse.json({ error: "Enter your total quotation in naira." }, { status: 400 });
    return NextResponse.json(outcome, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "You already responded to this opportunity." }, { status: 409 });
    return NextResponse.json({ error: "Your response could not be saved. Please retry." }, { status: 500 });
  }
}
