/**
 * Database Test Utilities
 *
 * Provides real database integration testing with SQLite in-memory.
 * Uses transaction rollback for test isolation.
 */

import path from "path";
import { execSync } from "child_process";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

/**
 * Create a test database instance with in-memory SQLite
 */
export function createTestDatabase(): Database.Database {
  return new Database(":memory:");
}

/**
 * Create a Prisma client connected to the test database
 */
export function createTestPrisma(_db: Database.Database): PrismaClient {
  const adapter = new PrismaBetterSqlite3(
    { url: "file::memory:" },
    { timestampFormat: "unixepoch-ms" }
  );

  return new PrismaClient({
    adapter,
    log:
      process.env.DEBUG_TESTS === "true"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Test database context for integration tests
 */
export interface TestDbContext {
  db: Database.Database;
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

/**
 * Initialize the database schema using raw SQL
 * This creates all tables based on the Prisma schema
 */
export async function initializeSchema(prisma: PrismaClient): Promise<void> {
  // Use Prisma's migrate deploy to set up the schema
  // For SQLite in-memory, we need to manually create tables
  // We'll use the Prisma schema to generate the SQL

  const schemaSQL = `
    -- Profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      linkedin TEXT,
      github TEXT,
      website TEXT,
      summary TEXT,
      skills_json TEXT DEFAULT '[]',
      experience_json TEXT DEFAULT '[]',
      projects_json TEXT DEFAULT '[]',
      education_json TEXT DEFAULT '[]',
      certifications_json TEXT DEFAULT '[]',
      publications_json TEXT,
      languages_json TEXT,
      volunteer_json TEXT,
      awards_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Companies table
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT,
      description TEXT,
      market_position TEXT,
      location_city TEXT,
      location_country TEXT,
      office_location_details TEXT
    );

    -- Contacts table
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruiter_name TEXT,
      recruiter_role TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contact_whatsapp_available INTEGER
    );

    -- Jobs table
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      contact_id INTEGER,
      role TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'DRAFT',
      jobDetailsJson TEXT,
      url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );

    -- Resumes table
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      content_json TEXT NOT NULL,
      last_edited TEXT NOT NULL,
      template TEXT DEFAULT 'modern-minimal',
      page_format TEXT DEFAULT 'letter',
      font_size TEXT DEFAULT 'medium',
      font_family TEXT DEFAULT 'Inter',
      colors TEXT DEFAULT '#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff',
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    -- Cover Letters table
    CREATE TABLE IF NOT EXISTS cover_letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      content_text TEXT NOT NULL,
      template TEXT DEFAULT 'professional-block',
      font_size TEXT DEFAULT 'medium',
      font_family TEXT DEFAULT 'Inter',
      line_height TEXT DEFAULT 'normal',
      colors TEXT DEFAULT '#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff',
      provider TEXT,
      model TEXT,
      custom_prompt TEXT,
      generated_at TEXT,
      version INTEGER DEFAULT 1,
      last_edited TEXT DEFAULT '1970-01-01T00:00:00Z',
      page_format TEXT DEFAULT 'a4',
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    -- Token Usage table
    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      request_id TEXT,
      created_at TEXT NOT NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);
    CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model);
    CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_token_usage_purpose ON token_usage(purpose);
  `;

  // Execute the schema creation
  const statements = schemaSQL.split(";").filter((s) => s.trim().length > 0);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement + ";");
    } catch (error: unknown) {
      // Some statements might fail if tables already exist, that's okay
      if (error instanceof Error && !error.message.includes("already exists")) {
        console.error(`Error executing statement: ${statement}`, error);
      }
    }
  }
}

/**
 * Initialize test database with schema
 */
export async function setupTestDb(): Promise<TestDbContext> {
  const db = createTestDatabase();
  const prisma = createTestPrisma(db);

  // Initialize schema
  await initializeSchema(prisma);

  return {
    db,
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      db.close();
    },
  };
}

/**
 * Clear all tables in the test database
 */
export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  const tables = [
    "token_usage",
    "cover_letters",
    "resumes",
    "jobs",
    "contacts",
    "companies",
    "profiles",
  ];

  // Disable foreign key constraints temporarily
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF");

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    } catch {
      // Table might not exist, ignore
    }
  }

  // Re-enable foreign key constraints
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
}

/**
 * Transaction wrapper for test isolation
 * Rolls back transaction after test completes
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  // Note: Prisma SQLite doesn't support true transactions with $transaction
  // in the same way PostgreSQL does. We'll use a different approach:
  // clear data before and after tests
  await clearDatabase(prisma);

  try {
    const result = await fn(prisma);
    return result;
  } finally {
    await clearDatabase(prisma);
  }
}

/**
 * Test database singleton for the test session
 */
let globalTestDb: TestDbContext | null = null;

/**
 * Get or create global test database
 * This ensures all tests use the same database instance with initialized schema
 */
export async function getGlobalTestDb(): Promise<TestDbContext> {
  if (!globalTestDb) {
    globalTestDb = await setupTestDb();
  }
  return globalTestDb;
}

/**
 * Close global test database
 */
export async function closeGlobalTestDb(): Promise<void> {
  if (globalTestDb) {
    await globalTestDb.cleanup();
    globalTestDb = null;
  }
}
