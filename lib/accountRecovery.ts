import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const purposeSchema = z.enum(["RESET_PASSWORD", "VERIFY_EMAIL"]);
export type AccountPurpose = z.infer<typeof purposeSchema>;
export const requestSchema = z.object({ purpose: purposeSchema, email: z.string().trim().email().max(254).optional() });
export const consumeSchema = z.object({
  purpose: purposeSchema,
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password exceeds 72 bytes").optional(),
}).refine((value) => value.purpose !== "RESET_PASSWORD" || Boolean(value.password), "A new password is required");

// No public delivery adapter is enabled yet. Preview access must never use live data.
export function emailPreviewEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "development" || env.ACCOUNT_EMAIL_PREVIEW !== "true" || env.VERCEL) return false;
  try {
    return [env.DATABASE_URL, env.DIRECT_URL].every((value) => {
      if (!value) return false;
      const url = new URL(value);
      return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname === "/cvdeck_account_dev";
    });
  } catch { return false; }
}

export function localPreviewRequest(req: Request) {
  const url = new URL(req.url);
  return emailPreviewEnabled() && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    && req.headers.get("origin") === url.origin;
}

export const hashAccountToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueAccountToken(userId: string, purpose: AccountPurpose) {
  const rawToken = randomBytes(32).toString("hex");
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    // Lock the account so concurrent issue/consume operations share the same order.
    const user = await tx.user.update({ where: { id: userId }, data: { updatedAt: now }, select: { email: true, emailVerifiedAt: true } });
    if (purpose === "VERIFY_EMAIL" && user.emailVerifiedAt) return null;
    const previous = await tx.accountToken.findUnique({ where: { userId_purpose: { userId, purpose } } });
    if (previous && now.getTime() - previous.issuedAt.getTime() < 60_000) return null;
    const expiresAt = new Date(now.getTime() + (purpose === "RESET_PASSWORD" ? 30 * 60_000 : 24 * 60 * 60_000));
    const data = { email: user.email, tokenHash: hashAccountToken(rawToken), expiresAt, issuedAt: now, consumedAt: null };
    await tx.accountToken.upsert({ where: { userId_purpose: { userId, purpose } }, create: { userId, purpose, ...data }, update: data });
    return { token: rawToken, expiresAt, email: user.email };
  });
}

export async function consumeAccountToken(input: z.infer<typeof consumeSchema>) {
  const tokenHash = hashAccountToken(input.token);
  const record = await prisma.accountToken.findUnique({ where: { tokenHash } });
  if (!record || record.purpose !== input.purpose || record.consumedAt || record.expiresAt <= new Date()) return false;
  const password = input.purpose === "RESET_PASSWORD" ? await bcrypt.hash(input.password!, 12) : undefined;
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const user = await tx.user.update({ where: { id: record.userId }, data: { updatedAt: now }, select: { email: true } });
    if (user.email !== record.email) return false;
    const claimed = await tx.accountToken.updateMany({
      where: { id: record.id, tokenHash, purpose: input.purpose, email: user.email, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: password
      ? { password, sessionVersion: { increment: 1 } }
      : { emailVerifiedAt: now } });
    return true;
  });
}
