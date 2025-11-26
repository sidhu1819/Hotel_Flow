import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

// Get the connection URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// 1. Configure the PostgreSQL Pool
// CRITICAL FIX: For external databases like Neon, 'ssl: true' is mandatory.
const pool = new Pool({
  connectionString: connectionString,
  ssl: true, // This tells the driver to use SSL/TLS encryption
});

// 2. Create the Drizzle DB instance
export const db = drizzle(pool, { schema });

// Optional: Add a connection test to ensure it's working (good for debugging)
async function testConnection() {
    try {
        await pool.query('SELECT NOW()');
        console.log("Database connected successfully!");
    } catch (error) {
        console.error("Database connection failed:", error);
        // Throwing the error here ensures the server startup fails if DB connection is vital
        throw new Error("Failed to connect to the database. Check logs.");
    }
}

// Ensure connection is tested on server startup
testConnection();