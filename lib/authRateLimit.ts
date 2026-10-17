import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

type RequestHeaders = Headers | Record<string, string | string[] | undefined>;
export type AuthLimitScope = "login-ip" | "login-email" | "register-ip" | "register-email";
export const authLimits = {
  "login-ip": { limit: 60, seconds: 900 },
  "login-email": { limit: 15, seconds: 900 },
  "register-ip": { limit: 10, seconds: 3600 },
  "register-email": { limit: 3, seconds: 3600 },
} as const;

export class AuthRateLimitError extends Error {
  constructor(public retryAfter: number) { super("TooManyAttempts"); }
}

export function authClientAddress(headers: RequestHeaders | undefined, env: NodeJS.ProcessEnv = process.env) {
  // Trust the platform-supplied address only on Vercel. Do not trust arbitrary
  // forwarding headers on a directly exposed/custom-hosted server.
  if (env.VERCEL !== "1") {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return "local-development";
    throw new Error("Trusted authentication proxy is not configured");
  }
  const value = headers instanceof Headers ? headers.get("x-vercel-forwarded-for") : headers?.["x-vercel-forwarded-for"];
  if (typeof value !== "string" || !isIP(value.trim())) throw new Error("Trusted client address is unavailable");
  const address = value.trim();
  return isIP(address) === 6 ? new URL(`http://[${address}]/`).hostname : address;
}

export function authBucketKey(scope: AuthLimitScope, identity: string, secret = process.env.NEXTAUTH_SECRET) {
  if (!secret) throw new Error("Authentication secret is required");
  return createHmac("sha256", secret).update(`${scope}:${identity.trim().toLowerCase()}`).digest("hex");
}

export async function consumeAuthLimit(scope: AuthLimitScope, identity: string) {
  const { limit, seconds } = authLimits[scope];
  const key = authBucketKey(scope, identity);
  // A single atomic UPSERT prevents parallel serverless requests from bypassing
  // the counter. Blocked attempts do not extend the current cooldown.
  const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
    INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
        ELSE LEAST("AuthRateLimit"."count" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second'
        ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "count", "expiresAt"
  `;
  if (!rows[0]) throw new Error("Authentication limiter unavailable");
  if (rows[0].count > limit) throw new AuthRateLimitError(Math.max(1, Math.ceil((rows[0].expiresAt.getTime() - Date.now()) / 1000)));
}
