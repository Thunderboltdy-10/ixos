import { desc, eq, inArray } from "drizzle-orm";
import { db, subscriptions, users } from "@/lib/db";
import {
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
  isSubscriptionActive,
} from "@/lib/controlPlane";
import { getLemonCustomerPortalUrl } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(req);
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userRecord = await getOrCreateUserByClerkId(clerkUserId);
    console.log(`[SubAPI] Checked User: ClerkID=${clerkUserId} -> DbID=${userRecord.id}, Email=${userRecord.email}`);

    // Robustness: Find ALL users with this email (handles ghost users created by webhooks)
    const linkedUsers = await db.query.users.findMany({
      where: eq(users.email, userRecord.email),
      columns: { id: true }
    });

    const userIds = linkedUsers.map(u => u.id);
    if (!userIds.includes(userRecord.id)) {
      userIds.push(userRecord.id);
    }

    console.log(`[SubAPI] Searching subs for UserIDs: ${userIds.join(', ')}`);

    const subscription = await db.query.subscriptions.findFirst({
      where: inArray(subscriptions.userId, userIds),
      orderBy: desc(subscriptions.updatedAt),
    });

    console.log(`[SubAPI] Found Subscription:`, subscription ? {
      id: subscription.id,
      lemonId: subscription.lemonSubscriptionId,
      status: subscription.status,
      plan: subscription.plan,
      ends: subscription.currentPeriodEnd,
      updated: subscription.updatedAt
    } : "None");

    if (!subscription) {
      return Response.json({
        plan: "free",
        status: "none",
        isActive: false,
        currentPeriodEnd: null,
        portalUrl: null,
      });
    }

    const active = isSubscriptionActive({
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });

    console.log(`[SubAPI] Calculated Active: ${active}`);

    let portalUrl: string | null = null;
    if (active) {
      try {
        portalUrl = await getLemonCustomerPortalUrl(subscription.lemonSubscriptionId);
      } catch (error) {
        console.error("Failed to fetch Lemon portal URL:", error);
      }
    }

    return Response.json({
      plan: active ? subscription.plan : "free",
      status: subscription.status,
      isActive: active,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      portalUrl,
    });
  } catch (error) {
    console.error("Subscription fetch failed:", error);
    return new Response("Failed to load subscription", { status: 500 });
  }
}
