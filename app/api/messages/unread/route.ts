import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadCount = await prisma.message.count({
    where: { receiverId: user.id, read: false },
  });

  return NextResponse.json({ unreadCount });
}
