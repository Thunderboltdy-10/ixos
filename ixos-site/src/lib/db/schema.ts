import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Users (synced from Clerk via webhook)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscriptions (derived from Lemon Squeezy webhooks)
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  lemonCustomerId: text("lemon_customer_id"),
  lemonSubscriptionId: text("lemon_subscription_id").notNull().unique(),
  status: text("status").notNull(),
  plan: text("plan").notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Devices registered by users
export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  deviceId: text("device_id").notNull().unique(),
  deviceLabel: text("device_label").notNull(),
  devicePublicKey: text("device_public_key"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Active leases for Pro entitlements (1 active per user)
export const leases = pgTable("leases", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  deviceId: uuid("device_id").references(() => devices.id).notNull(),
  status: text("status").notNull(), // active | revoked | expired
  issuedAt: timestamp("issued_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  uniqueIndex("one_active_lease_per_user_idx")
    .on(table.userId)
    .where(sql`status = 'active'`)
]);

// Device transfer requests for lease switching
export const leaseTransfers = pgTable("lease_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  fromDeviceId: uuid("from_device_id").references(() => devices.id),
  toDeviceId: uuid("to_device_id").references(() => devices.id).notNull(),
  token: text("token").notNull().unique(),
  status: text("status").notNull(), // pending | approved | expired | cancelled
  requestedAt: timestamp("requested_at").notNull(),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at").notNull(),
});

// Trusted devices (previously approved via email, can switch instantly)
export const trustedDevices = pgTable("trusted_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  deviceId: uuid("device_id").references(() => devices.id).notNull(),
  trustedAt: timestamp("trusted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_trusted_device_idx").on(table.userId, table.deviceId)
]);

// Webhook audit log
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id"),
    provider: text("provider").notNull(),
    eventName: text("event_name").notNull(),
    rawBody: text("raw_body").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    processedAt: timestamp("processed_at"),
    processingError: text("processing_error"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (table) => [
    // Unique index for idempotency - prevents duplicate webhook processing
    uniqueIndex("webhook_events_provider_event_id_idx").on(
      table.provider,
      table.eventId
    ),
  ]
);

export type User = typeof users.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Lease = typeof leases.$inferSelect;
export type LeaseTransfer = typeof leaseTransfers.$inferSelect;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
