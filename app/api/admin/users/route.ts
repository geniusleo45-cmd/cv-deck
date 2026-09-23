import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({ userId: z.string().min(1), role: z.enum(["CUSTOMER", "VENDOR", "RECRUITER", "ADMIN"]) });

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
  if (input.data.userId === admin.id) return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  const user = await prisma.user.update({ where: { id: input.data.userId }, data: { role: input.data.role }, select: { id: true, role: true } }).catch(() => null);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json(user);
}
