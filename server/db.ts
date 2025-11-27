import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

// Get the connection URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// 1. Configure the PostgreSQL Pool
// Use SSL for hosted providers (Neon, Supabase, etc.), but disable for local dev
const shouldUseSSL =
  !/localhost|127\.0\.0\.1/i.test(connectionString) &&
  process.env.DATABASE_SSL !== "false";

const pool = new Pool({
  connectionString,
  ssl: shouldUseSSL
    ? { rejectUnauthorized: false }
    : undefined,
});

// 2. Create the Drizzle DB instance
export const db = drizzle(pool, { schema });

// Optional: Add a connection test to ensure it's working (good for debugging)
export async function testConnection() {
    try {
        await pool.query('SELECT NOW()');
        console.log("Database connected successfully!");
    } catch (error) {
        console.error("Database connection failed:", error);
        // Throwing the error here ensures the server startup fails if DB connection is vital
        throw new Error("Failed to connect to the database. Check logs.");
    }
}