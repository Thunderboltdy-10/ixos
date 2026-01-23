import { pgTable, serial, text, timestamp, boolean, integer, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';

// Users (synced from Clerk via webhook)
export const users = pgTable('users', {
    id: text('id').primaryKey(), // Clerk user ID
    email: text('email').notNull().unique(),
    name: text('name'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Purchases (from Lemon Squeezy webhooks)
export const purchases = pgTable('purchases', {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    lemonSqueezyOrderId: text('lemonsqueezy_order_id').notNull().unique(),
    lemonSqueezyCustomerId: text('lemonsqueezy_customer_id'),
    productId: text('product_id').notNull(), // 'pro' | 'team'
    variantId: text('variant_id').notNull(),
    status: text('status').notNull(), // 'active' | 'cancelled' | 'refunded' | 'expired'
    purchasedAt: timestamp('purchased_at').notNull(),
    expiresAt: timestamp('expires_at'), // For subscriptions
    metadata: jsonb('metadata'), // Store plan details
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// License Keys (generated on purchase)
export const licenseKeys = pgTable('license_keys', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').references(() => users.id).notNull(),
    purchaseId: integer('purchase_id').references(() => purchases.id).notNull(),
    key: varchar('key', { length: 64 }).notNull().unique(), // Format: IXOS-XXXX-XXXX-XXXX-XXXX
    tier: text('tier').notNull(), // 'free' | 'pro' | 'team'
    machineLimit: integer('machine_limit').default(3),
    activatedMachines: jsonb('activated_machines').default([]),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
});

// Downloads (tracking)
export const downloads = pgTable('downloads', {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => users.id), // nullable for anonymous
    platform: text('platform').notNull(), // 'windows' | 'macos' | 'linux'
    version: text('version').notNull(),
    ipHash: text('ip_hash'), // Hashed IP for fraud prevention
    userAgent: text('user_agent'),
    downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
});

// Waitlist
export const waitlist = pgTable('waitlist', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    source: text('source'), // 'hero' | 'footer' | 'pricing' | 'download'
    referrer: text('referrer'),
    confirmedAt: timestamp('confirmed_at'), // Double opt-in
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type LicenseKey = typeof licenseKeys.$inferSelect;
export type NewLicenseKey = typeof licenseKeys.$inferInsert;
export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
