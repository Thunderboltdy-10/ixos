import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    const client = getDb();
    if (typeof prop === "string") {
      const record = client as Record<string, unknown>;
      return record[prop];
    }
    return undefined;
  },
});

export * from "./schema";
