import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a function that returns the database client
// This is lazy-loaded to handle missing DATABASE_URL during build
function getDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    const sql = neon(process.env.DATABASE_URL);
    // @ts-expect-error - Type mismatch between drizzle-orm and neon versions
    return drizzle(sql, { schema });
}

// Export a proxy that lazily initializes the db
export const db = new Proxy({} as ReturnType<typeof getDb>, {
    get(_, prop) {
        const client = getDb();
        return (client as any)[prop];
    },
});

// Export schema for convenience
export * from './schema';
