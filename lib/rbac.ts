import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Please log in");
  }
  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Requires one of [${allowedRoles.join(", ")}] roles`);
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"]);
}

export async function requireVendor() {
  return requireRole(["VENDOR", "ADMIN"]);
}

export async function requireRecruiter() {
  return requireRole(["RECRUITER", "ADMIN"]);
}
