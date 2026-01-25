import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db, users, subscriptions, devices, leases } from "@/lib/db";
import { getLemonCustomerPortalUrl } from "@/lib/lemonsqueezy";
import { isSubscriptionActive } from "@/lib/controlPlane";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/sections/Footer";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { AccountDashboard } from "./AccountDashboard";

export default async function AccountPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in?redirect_url=/account");
  }

  const clerkUser = await currentUser();

  // Get user from database
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  // Get subscription
  const subscription = user
    ? await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, user.id),
        orderBy: desc(subscriptions.updatedAt),
      })
    : null;

  // Get devices
  const userDevices = user
    ? await db.query.devices.findMany({
        where: eq(devices.userId, user.id),
        orderBy: desc(devices.lastSeenAt),
      })
    : [];

  // Get active lease
  const activeLease = user
    ? await db.query.leases.findFirst({
        where: eq(leases.userId, user.id),
      })
    : null;

  // Determine plan
  const isProActive =
    !!subscription &&
    isSubscriptionActive({
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });

  let portalUrl: string | null = null;
  if (subscription && isProActive) {
    try {
      portalUrl = await getLemonCustomerPortalUrl(subscription.lemonSubscriptionId);
    } catch (error) {
      console.error("Failed to fetch Lemon portal URL:", error);
    }
  }

  return (
    <main className="flex flex-col min-h-screen w-full overflow-x-hidden bg-bg-graphite-0">
      <Nav />

      <section className="pt-32 pb-8">
        <SectionDivider accent="teal" label="ACCOUNT_MODULE" />

        <div className="container mx-auto px-6 py-16">
          <AccountDashboard
            clerkUser={{
              id: clerkUserId,
              email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email ?? "",
              name: clerkUser?.fullName ?? user?.name ?? null,
              imageUrl: clerkUser?.imageUrl ?? user?.imageUrl ?? null,
            }}
            subscription={
              subscription
                ? {
                    status: subscription.status,
                    plan: subscription.plan,
                    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
                  }
                : null
            }
            devices={userDevices.map((d) => ({
              id: d.id,
              deviceId: d.deviceId,
              deviceLabel: d.deviceLabel,
              lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
              isActive: activeLease?.deviceId === d.id && activeLease?.status === "active",
            }))}
            isPro={isProActive ?? false}
            portalUrl={portalUrl}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
