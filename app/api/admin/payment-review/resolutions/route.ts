import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

const schema = z.object({
  requestId: z.uuid(),
  kind: z.enum(["order", "campaign"]),
  targetId: z.string().min(1).max(100),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "REFUND_RECORDED"]),
  note: z.string().trim().min(10).max(2000),
  externalReference: z.string().trim().max(200).default(""),
}).refine((value) => value.status !== "REFUND_RECORDED" || value.externalReference.length > 0);

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a note of 10–2000 characters and a provider reference for a recorded refund." }, { status: 400 });
  const { requestId, ...input } = parsed.data;
  try {
    const previous = await prisma.paymentReviewEntry.findUnique({ where: { id: requestId } });
    if (previous) {
      const matches = previous.adminId === admin.id && previous.kind === input.kind && previous.targetId === input.targetId && previous.status === input.status && previous.note === input.note && (previous.externalReference || "") === input.externalReference;
      return NextResponse.json(matches ? { saved: true } : { error: "This request was already used. Refresh before saving." }, { status: matches ? 200 : 409 });
    }
    const payment = input.kind === "order" ? await prisma.payment.findUnique({ where: { id: input.targetId } }) : null;
    const campaign = input.kind === "campaign" ? await prisma.adCampaign.findUnique({ where: { id: input.targetId } }) : null;
    const reference = payment?.reference || campaign?.paymentReference;
    if (!reference) return NextResponse.json({ error: "Payment reference not found." }, { status: 404 });
    await prisma.paymentReviewEntry.create({ data: {
      id: requestId, ...input, externalReference: input.externalReference || null,
      paymentReference: reference, adminId: admin.id, adminName: admin.name || admin.email || admin.id,
    } });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "Save could not be confirmed. Retry without changing the entry; duplicate requests will not create another record." }, { status: 503 });
  }
}
