import { getCurrentUser } from "@/lib/rbac";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ receiverId?: string; conversationId?: string }>;
}) {
  const { receiverId, conversationId } = await searchParams;
  const user = await getCurrentUser();
  const recipient = user && receiverId ? await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true, name: true, avatar: true, role: true } }) : null;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-blue-600" /> Direct Messaging Portal
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Communicate with Computer Village gadget vendors, hardware technicians, and recruiters in real-time.
        </p>
      </div>

      <ChatWindow initialReceiverId={receiverId} initialConversationId={conversationId} initialParticipant={recipient} />
    </div>
  );
}
