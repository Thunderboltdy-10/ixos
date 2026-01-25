import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";
import { SignJWT, importPKCS8 } from "jose";
import { desc, eq } from "drizzle-orm";
import { db, users, subscriptions } from "@/lib/db";

export const TOKEN_ISSUER = "ixos-control-plane";
export const ENTITLEMENT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Plan = "free" | "pro";

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

export function getClerkUserId(): string | null {
  const { userId } = auth();
  return userId ?? null;
}

export async function getClerkUserIdFromRequest(req?: Request): Promise<string | null> {
  if (!req) return getClerkUserId();

  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  if (bearerToken) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    const jwtKey = process.env.CLERK_JWT_KEY;
    if (!secretKey && !jwtKey) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Missing CLERK_SECRET_KEY or CLERK_JWT_KEY for token verification.");
      }
      return null;
    }
    try {
      const { data, errors } = await verifyToken(bearerToken, {
        secretKey,
        jwtKey,
        // Optionally restrict to expected audiences
        authorizedParties: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          ? undefined // Clerk handles this automatically with the secret key
          : undefined,
      });
      if (!errors && data?.sub) {
        return typeof data.sub === "string" ? data.sub : null;
      }
      // Enhanced error logging for debugging
      if (errors?.length) {
        console.error("Clerk token verification failed:", JSON.stringify(errors, null, 2));
        console.error("Token prefix:", bearerToken.slice(0, 20) + "...");
        console.error("Has secretKey:", !!secretKey, "Has jwtKey:", !!jwtKey);
      }
    } catch (error) {
      console.error("Failed to verify Clerk token:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    }
  }

  return getClerkUserId();
}

export async function getOrCreateUserByClerkId(clerkUserId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (existing) {
    return existing;
  }

  let clerkUser = await currentUser();
  if (!clerkUser) {
    clerkUser = await clerkClient.users.getUser(clerkUserId);
  }
  if (!clerkUser) {
    throw new Error("Missing Clerk user");
  }
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    ) ?? clerkUser.emailAddresses[0];

  if (!primaryEmail?.emailAddress) {
    throw new Error("Missing Clerk email");
  }

  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");

  const [created] = await db
    .insert(users)
    .values({
      clerkUserId,
      email: primaryEmail.emailAddress,
      name: name || null,
      imageUrl: clerkUser.imageUrl || null,
    })
    .returning();

  if (created) {
    return created;
  }

  const fallback = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!fallback) {
    throw new Error("Failed to create user");
  }
  return fallback;
}

export function normalizePlanFromProductName(name?: string | null): Plan {
  if (!name) return "pro";
  const lower = name.toLowerCase();
  if (lower.includes("team")) {
    return "pro";
  }
  return "pro";
}

export function normalizeSubscriptionStatus(raw?: string | null): string {
  if (!raw) return "unknown";
  const normalized = raw.toLowerCase();
  if (normalized === "on_trial") return "trialing";
  if (normalized === "active") return "active";
  if (normalized === "past_due") return "past_due";
  if (normalized === "paused") return "paused";
  if (normalized === "unpaid") return "past_due";
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized === "expired") return "expired";
  return normalized;
}

export function isSubscriptionActive({
  status,
  currentPeriodEnd,
}: {
  status?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  const normalized = normalizeSubscriptionStatus(status ?? null);
  if (!ACTIVE_SUB_STATUSES.has(normalized)) {
    return false;
  }
  if (currentPeriodEnd && currentPeriodEnd.getTime() < Date.now()) {
    return false;
  }
  return true;
}

export async function getActivePlanForUser(userId: string): Promise<Plan> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: desc(subscriptions.updatedAt),
  });
  if (!sub) return "free";

  if (!isSubscriptionActive({ status: sub.status, currentPeriodEnd: sub.currentPeriodEnd })) {
    return "free";
  }
  return sub.plan === "pro" ? "pro" : "free";
}

export async function issueEntitlementToken({
  clerkUserId,
  deviceId,
  plan,
  features = [],
}: {
  clerkUserId: string;
  deviceId: string;
  plan: Plan;
  features?: string[];
}) {
  const privateKeyPem = process.env.IXOS_JWT_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw new Error("IXOS_JWT_PRIVATE_KEY is not set");
  }
  const privateKey = await importPKCS8(privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    plan,
    features,
    did: deviceId,
  })
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setIssuer(TOKEN_ISSUER)
    .setSubject(clerkUserId)
    .setIssuedAt(now)
    .setExpirationTime(now + ENTITLEMENT_TTL_SECONDS)
    .sign(privateKey);
}
