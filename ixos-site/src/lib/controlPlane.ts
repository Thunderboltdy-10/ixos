import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";
import { SignJWT, importPKCS8, decodeJwt } from "jose";
import { desc, eq } from "drizzle-orm";
import { db, users, subscriptions } from "@/lib/db";

export const TOKEN_ISSUER = "ixos-control-plane";
export const ENTITLEMENT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Plan = "free" | "pro";

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function getClerkUserIdFromRequest(req?: Request): Promise<string | null> {
  if (!req) return await getClerkUserId();

  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  if (bearerToken) {
    try {
      // LOGGING: Decode without verify to see what we are dealing with
      try {
        const decoded = decodeJwt(bearerToken);
        console.log("[Auth] Token PEEK (pre-verify):", {
          sub: decoded.sub,
          iss: decoded.iss,
          exp: decoded.exp,
          sid: decoded.sid // session id
        });
      } catch (e) {
        console.error("[Auth] Token PEEK FAILED: Could not decode JWT.", e);
      }

      let jwtKey = process.env.CLERK_JWT_KEY;
      const secretKey = process.env.CLERK_SECRET_KEY;

      // Fix PEM newlines if present
      if (jwtKey) {
        jwtKey = jwtKey.replace(/\\n/g, "\n");
      }

      // 1. Try JWT Key (Fast, Local) if available
      if (jwtKey) {
        try {
          const verified = await verifyToken(bearerToken, { jwtKey });
          // verifyToken returns the payload directly or throws
          if (verified?.sub) {
            return verified.sub as string;
          }
        } catch (e) {
          console.warn(`[Auth] jwtKey verification failed: ${e}`);
          // Continue to secretKey fallback
        }
      }

      // 2. Fallback to Secret Key (Network, Robust)
      if (secretKey) {
        try {
          console.log("[Auth] Attempting fallback to Secret Key verification...");
          const verified = await verifyToken(bearerToken, { secretKey });

          if (verified?.sub) {
            console.log("[Auth] Secret Key verification SUCCESS.");
            return verified.sub as string;
          } else {
            console.error("[Auth] Secret Key verification passed but 'sub' is missing.", verified);
          }
        } catch (e) {
          console.error(`[Auth] Secret Key verification failed: ${e}`);
        }
      }

      console.error("[Auth] All token verification attempts failed.");

    } catch (error) {
      console.error("Fatal error in getClerkUserIdFromRequest:", error);
    }
  }

  // No warning here to avoid spamming Landing Page logs
  return await getClerkUserId();
}

export async function getOrCreateUserByClerkId(clerkUserId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (existing) {
    return existing;
  }

  console.log(`[Auth] User not found in DB for ClerkID: ${clerkUserId}. Fetching from Clerk...`);
  let clerkUser = await currentUser();
  if (!clerkUser) {
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(clerkUserId);
    } catch (e) {
      console.error(`[Auth] Failed to fetch user from Clerk Client:`, e);
    }
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

  // SELF-HEALING: Check if email exists with a DIFFERENT Clerk ID
  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, primaryEmail.emailAddress)
  });

  if (existingByEmail) {
    console.warn(`[Auth] HEALING: Found user by email '${primaryEmail.emailAddress}' with old ID '${existingByEmail.clerkUserId}'. Updating to '${clerkUserId}'.`);
    const [updated] = await db.update(users)
      .set({ clerkUserId: clerkUserId, updatedAt: new Date() })
      .where(eq(users.id, existingByEmail.id))
      .returning();
    return updated;
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
    console.log(`[Auth] Created new user in DB: ${created.id}`);
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
  if (!name) return "free";
  const lower = name.toLowerCase();
  if (lower.includes("team") || lower.includes("pro")) {
    return "pro";
  }
  return "free";
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

  // Grace period of 24 hours to handle webhook delays
  const GRACE_PERIOD_MS = 1000 * 60 * 60 * 24;
  const now = Date.now();

  console.log(`[isSubscriptionActive] Checking: status=${status} (norm=${normalized}), ends=${currentPeriodEnd?.toISOString()}`);

  // If active/trialing/past_due, logic is standard
  if (ACTIVE_SUB_STATUSES.has(normalized)) {
    // If we have an end date and it's long passed (outside grace), then inactive
    // But usually 'active' status from Lemon should be enough unless we want to enforce local expiration
    if (currentPeriodEnd && currentPeriodEnd.getTime() + GRACE_PERIOD_MS < now) {
      // It says active but date is old + grace period passed -> likely webhook failure or expired
      // But let's trust the status more if it says "active"? 
      // Actually, if it says active but date is old, assume renewal webhook is just Late. 
      // So as long as status is Active, we are good?
      // No, let's keep the date check but with grace.
      console.log(`[isSubscriptionActive] >> False: Active status but expired beyond grace period. Diff=${now - currentPeriodEnd.getTime()}ms`);
      return false;
    }
    console.log(`[isSubscriptionActive] >> True: Status '${normalized}' is active/trialing/past_due.`);
    return true;
  }

  // If cancelled, they should still have access until the period ends
  if (normalized === "cancelled") {
    if (currentPeriodEnd && currentPeriodEnd.getTime() > now) {
      console.log(`[isSubscriptionActive] >> True: Cancelled but still in period.`);
      return true;
    }
    console.log(`[isSubscriptionActive] >> False: Cancelled and period ended.`);
  }

  console.log(`[isSubscriptionActive] >> False: Status '${normalized}' not in active set.`);
  return false;
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
