import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRecruiter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
const schema = z.object({ companyName: z.string().min(2), industry: z.string().optional(), website: z.string().url().optional().or(z.literal("")), phone: z.string().optional() });
export async function PUT(request: Request) { try { const user = await requireRecruiter(); const input = schema.parse(await request.json()); const profile = await prisma.recruiterProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, companyName: input.companyName, industry: input.industry || null, website: input.website || null, phone: input.phone || null }, update: { companyName: input.companyName, industry: input.industry || null, website: input.website || null, phone: input.phone || null } }); return NextResponse.json(profile); } catch (error: any) { return NextResponse.json({ error: error.name === "ZodError" ? error.errors[0].message : "Unable to update company profile." }, { status: 400 }); } }
