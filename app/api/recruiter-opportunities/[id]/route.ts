import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isVerifiedApplicant, reviewSchema } from "@/lib/recruiterOpportunities";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const input = await request.json().catch(() => null);
  const review = reviewSchema.safeParse(input);
  if (input?.action !== "close" && !review.success) return NextResponse.json({ error: "Choose a valid action." }, { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    const owned = await tx.recruiterOpportunity.updateMany({ where: { id, ownerId: session.id, owner: { role: "RECRUITER" } }, data: { updatedAt: new Date() } });
    if (!owned.count) return "forbidden";
    if (input?.action === "close") {
      await tx.recruiterOpportunity.update({ where: { id }, data: { status: "CLOSED" } });
      return "updated";
    }
    if (!review.success) return "invalid";
    const response = await tx.opportunityResponse.findFirst({ where: { id: review.data.responseId, opportunityId: id }, include: { applicant: { select: { role: true, vendorProfile: { select: { status: true } }, recruiterProfile: { select: { verified: true } } } } } });
    if (!response) return "forbidden";
    if (review.data.status !== "DECLINED" && !isVerifiedApplicant(response.applicant)) return "unverified";
    if (response.status === review.data.status) return "updated";
    await tx.opportunityResponse.update({ where: { id: response.id }, data: { status: review.data.status } });
    await tx.notification.create({ data: { userId: response.applicantId, type: "SYSTEM", title: "Opportunity response updated", message: `Your application or quotation is now ${review.data.status.toLowerCase()}. Selection does not create an order, payment or employment contract.`, link: `/dashboard/opportunities/${id}` } });
    return "updated";
  });
  if (result === "forbidden") return NextResponse.json({ error: "Opportunity or response not found." }, { status: 404 });
  if (result === "unverified") return NextResponse.json({ error: "This account is no longer verified. It cannot be shortlisted or selected." }, { status: 409 });
  return NextResponse.json({ updated: true });
}
