import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    const messages = await prisma.message.findMany({
      where: { conversationId, OR: [{ senderId: sessionUser.id }, { receiverId: sessionUser.id }] },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
        receiver: { select: { id: true, name: true, avatar: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark unread messages received by sessionUser as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: sessionUser.id,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch thread messages" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const { content, receiverId } = await req.json();

    if (!content || !receiverId) {
      return NextResponse.json({ error: "Content and receiverId are required" }, { status: 400 });
    }

    const participant = await prisma.message.findFirst({ where: { conversationId, OR: [{ senderId: sessionUser.id }, { receiverId: sessionUser.id }] }, select: { id: true } });
    if (!participant || receiverId === sessionUser.id) return NextResponse.json({ error: "You cannot send messages in this conversation." }, { status: 403 });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: sessionUser.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    await Promise.all([
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
      prisma.notification.create({
        data: {
          userId: receiverId,
          type: "MESSAGE",
          title: `New message from ${sessionUser.name || "a CV Deck user"}`,
          message: content.slice(0, 80) + (content.length > 80 ? "..." : ""),
          link: `/dashboard/messages?conversationId=${conversationId}`,
        },
      }),
    ]);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
