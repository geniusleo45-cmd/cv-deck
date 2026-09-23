import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { NotificationList } from "./NotificationList";

export default async function Page() {
  const user = await requireAuth();
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return <section className="space-y-6"><div><h1 className="text-2xl font-black">Notifications</h1><p className="text-sm text-gray-500">Your latest marketplace activity.</p></div><NotificationList notifications={notifications.map((notification) => ({ ...notification, createdAt: notification.createdAt.toISOString() }))} /></section>;
}
