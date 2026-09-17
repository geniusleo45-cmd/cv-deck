import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: sessionUser.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: sessionUser.id },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: sessionUser.id },
        data: { read: true },
      });
    }

    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
