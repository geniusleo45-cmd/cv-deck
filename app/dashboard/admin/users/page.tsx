import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { AdminUsersTable } from "./AdminUsersTable";

export default async function AdminUsersPage() { const admin = await requireAdmin(); const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" } }); return <section className="space-y-6"><div><h1 className="text-2xl font-black">User management</h1><p className="mt-1 text-sm text-gray-500">Search marketplace accounts and manage roles.</p></div><AdminUsersTable currentAdminId={admin.id} users={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))} /></section>; }
