import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";
import { SignJWT, importPKCS8, importSPKI, decodeJwt } from "jose";
import { desc, eq } from "drizzle-orm";
import { db, users, subscriptions } from "@/lib/db";

export const TOKEN_ISSUER = "ixos-control-plane";
export const ENTITLEMENT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Plan = "free" | "pro";

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

// Conditional debug logging to reduce Vercel log spam
const DEBUG = process.env.NODE_ENV === "development" || process.env.IXOS_DEBUG === "true";
function debugLog(...args: unknown[]) {
  if (DEBUG) console.log("[ControlPlane]", ...args);
}

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
    let verificationSucceeded = false;
    try {
      // Debug: Decode without verify to see what we are dealing with
      if (DEBUG) {
        try {
          const decoded = decodeJwt(bearerToken);
          debugLog("Token PEEK:", { sub: decoded.sub, iss: decoded.iss });
        } catch {
          // Silent in production
        }
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
          if (verified?.sub) {
            verificationSucceeded = true;
            return verified.sub as string;
          }
        } catch {
          // Continue to secretKey fallback (silent)
        }
      }

      // 2. Fallback to Secret Key (Network, Robust)
      if (secretKey) {
        try {
          debugLog("Attempting Secret Key verification fallback");
          const verified = await verifyToken(bearerToken, { secretKey });
          if (verified?.sub) {
            verificationSucceeded = true;
            return verified.sub as string;
          }
        } catch (e) {
          // Only log errors in debug mode
          debugLog("Secret Key verification failed:", e);
        }
      }

    } catch (error) {
      console.error("Fatal error in getClerkUserIdFromRequest:", error);
    }

    // Security: if a bearer token was provided but could not be verified,
    // never fall back to cookie/session auth for this request.
    if (!verificationSucceeded) {
      debugLog("Bearer token present but verification failed; rejecting request");
      return null;
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

  debugLog("User not found in DB, fetching from Clerk:", clerkUserId);
  let clerkUser = await currentUser();
  if (!clerkUser) {
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(clerkUserId);
    } catch (e) {
      debugLog("Failed to fetch user from Clerk Client:", e);
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
    debugLog("HEALING: Found user by email with old ID, updating");
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
    debugLog("Created new user in DB:", created.id);
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

  // If active/trialing/past_due, logic is standard
  if (ACTIVE_SUB_STATUSES.has(normalized)) {
    if (currentPeriodEnd && currentPeriodEnd.getTime() + GRACE_PERIOD_MS < now) {
      return false;
    }
    return true;
  }

  // If cancelled, they should still have access until the period ends
  if (normalized === "cancelled") {
    if (currentPeriodEnd && currentPeriodEnd.getTime() > now) {
      return true;
    }
  }

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

/**
 * Get subscription details including plan and period end date.
 * Used to set proper token expiry for Pro users.
 */
export async function getSubscriptionDetailsForUser(userId: string): Promise<{
  plan: Plan;
  currentPeriodEnd: Date | null;
}> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: desc(subscriptions.updatedAt),
  });
  if (!sub) return { plan: "free", currentPeriodEnd: null };

  if (!isSubscriptionActive({ status: sub.status, currentPeriodEnd: sub.currentPeriodEnd })) {
    return { plan: "free", currentPeriodEnd: null };
  }
  return {
    plan: sub.plan === "pro" ? "pro" : "free",
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

/**
 * Parse and sanitize private key from environment variable.
 * Handles both PKCS#8 (BEGIN PRIVATE KEY) and EC (BEGIN EC PRIVATE KEY) format labels,
 * but note that the underlying content must be in a format supported by the library.
 */
function parsePrivateKey(rawKey: string): string {
  if (!rawKey) {
    throw new Error("IXOS_JWT_PRIVATE_KEY is not set");
  }

  let key = rawKey.trim();

  // Handle escaped newlines - common in Vercel/environment variables
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  if (key.includes("\\\\n")) {
    key = key.replace(/\\\\n/g, "\n");
  }

  // Ensure BEGIN/END markers are present
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    throw new Error("Invalid PEM format: Missing BEGIN/END markers");
  }

  // Ensure trailing newline for some parsers
  if (!key.endsWith("\n")) {
    key = key + "\n";
  }

  return key;
}

// Pro capabilities to include in the token
const PRO_CAPABILITIES = [
  "ask_mode_plus",
  "memory_graph",
  "today_tab",
  "related_graph",
  "brief_inbox",
  "verified_session",
  "automation_actions",
];

export async function issueEntitlementToken({
  clerkUserId,
  deviceId,
  plan,
  features = [],
  offlineGraceDays = 14,
  subscriptionEnd,
}: {
  clerkUserId: string;
  deviceId: string;
  plan: Plan;
  features?: string[];
  offlineGraceDays?: number;
  subscriptionEnd?: Date | null;  // For Pro users, token expires at subscription end
}) {
  const rawKey = process.env.IXOS_JWT_PRIVATE_KEY || "";
  const privateKeyPem = parsePrivateKey(rawKey);

  let privateKey;
  try {
    // jose's importPKCS8 is strict about the PKCS#8 format (BEGIN PRIVATE KEY)
    if (privateKeyPem.includes("BEGIN EC PRIVATE KEY")) {
      debugLog("EC (SEC1) format detected, PKCS#8 preferred");
    }

    privateKey = await importPKCS8(privateKeyPem, "ES256");
  } catch (importError) {
    debugLog("Key import failed:", importError);

    if (privateKeyPem.includes("BEGIN EC PRIVATE KEY")) {
      throw new Error(
        "Invalid Key Format: You are using an 'EC PRIVATE KEY' (SEC1) which is not supported by the JWT library. " +
        "Please convert it to 'PKCS#8' format. " +
        "Run: openssl pkcs8 -topk8 -nocrypt -in your-key.pem -out pkcs8-key.pem"
      );
    }

    throw new Error(
      `Failed to import private key: ${importError instanceof Error ? importError.message : String(importError)}`
    );
  }

  // Determine capabilities based on plan
  const capabilities = plan === "pro"
    ? [...new Set([...PRO_CAPABILITIES, ...features])]
    : features;

  const now = Math.floor(Date.now() / 1000);

  // For Pro users with a subscription end date, expire token at subscription end
  // This ensures offline access ends when subscription ends
  // For free users or Pro without end date, use standard TTL
  let expirationTime: number;
  if (plan === "pro" && subscriptionEnd) {
    const subscriptionEndUnix = Math.floor(subscriptionEnd.getTime() / 1000);
    // Use the earlier of subscription end or standard TTL (for refresh purposes)
    expirationTime = Math.min(subscriptionEndUnix, now + ENTITLEMENT_TTL_SECONDS);
  } else {
    expirationTime = now + ENTITLEMENT_TTL_SECONDS;
  }

  return await new SignJWT({
    plan,
    capabilities,
    did: deviceId,
    // trusted_device_pubkey_hash is the deviceId itself (SHA256 of public key)
    trusted_device_pubkey_hash: deviceId,
    offline_grace_days: plan === "pro" ? 0 : offlineGraceDays, // No grace for Pro - strict sub end
    subscription_end: subscriptionEnd ? Math.floor(subscriptionEnd.getTime() / 1000) : undefined,
  })
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setIssuer(TOKEN_ISSUER)
    .setSubject(clerkUserId)
    .setIssuedAt(now)
    .setExpirationTime(expirationTime)
    .sign(privateKey);
}
