import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
const schema = z.object({ id: z.string().min(1), status: z.enum(["REVIEWED", "DISMISSED"]) });
export async function PUT(request: Request) { try { await requireAdmin(); const input = schema.parse(await request.json()); const report = await prisma.report.update({ where: { id: input.id }, data: { status: input.status } }); return NextResponse.json(report); } catch (error: any) { if (error.name === "ZodError") return NextResponse.json({ error: "Invalid report update." }, { status: 400 }); return NextResponse.json({ error: "Unable to update report." }, { status: 500 }); } }
