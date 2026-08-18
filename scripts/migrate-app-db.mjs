// Brings an existing app.db's schema in line with the current
// prisma/schema.prisma by diffing it against app-template.db (a fresh,
// fully-migrated db built via `prisma db push` at bundle time — see
// prepareTauriServer.mjs). Runs on every launch of the installed app, since
// updates replace the bundle but never touch the user's app-data db — see
// src-tauri/src/lib.rs::sync_database_schema.
//
// ponytail: additive only (new tables, new columns, new indexes) — matches
// how this schema has actually evolved so far. No renames/drops/type
// changes; add a real migration tool (prisma migrate) if that's ever needed.
import Database from "better-sqlite3";

const [, , templatePath, livePath] = process.argv;
if (!templatePath || !livePath) {
  console.error("Usage: migrate-app-db.mjs <templateDbPath> <liveDbPath>");
  process.exit(1);
}

const template = new Database(templatePath, { readonly: true });
const live = new Database(livePath);

const templateTables = template
  .prepare(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  )
  .all();

const liveTableNames = new Set(
  live
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )
    .all()
    .map((row) => row.name)
);

const statements = [];

for (const table of templateTables) {
  if (!liveTableNames.has(table.name)) {
    statements.push(table.sql);
    continue;
  }

  const templateColumns = template
    .prepare(`PRAGMA table_info(${table.name})`)
    .all();
  const liveColumnNames = new Set(
    live
      .prepare(`PRAGMA table_info(${table.name})`)
      .all()
      .map((col) => col.name)
  );

  for (const col of templateColumns) {
    if (liveColumnNames.has(col.name)) continue;

    let ddl = `ALTER TABLE ${table.name} ADD COLUMN ${col.name} ${col.type}`;
    if (col.notnull) {
      // SQLite requires a default when adding a NOT NULL column to a
      // populated table; fall back to the type's zero value if the
      // template itself has no default.
      const fallback = /INT|REAL|NUM/i.test(col.type) ? "0" : "''";
      ddl += ` NOT NULL DEFAULT ${col.dflt_value ?? fallback}`;
    } else if (col.dflt_value != null) {
      ddl += ` DEFAULT ${col.dflt_value}`;
    }
    statements.push(ddl);
  }
}

// Indexes are NOT carried by either path above: sqlite_master's CREATE TABLE
// sql omits them, and `ALTER TABLE ... ADD COLUMN` never brings a column's
// UNIQUE index with it. Without this pass, adding an `@unique` field to an
// existing model silently drops the constraint on every upgraded db while
// looking fine on a fresh install. Safe to run last: a unique index over a
// freshly-added column sees only NULLs, and SQLite permits duplicate NULLs.
const templateIndexes = template
  .prepare(
    "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL"
  )
  .all();

const liveIndexNames = new Set(
  live
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL"
    )
    .all()
    .map((row) => row.name)
);

for (const index of templateIndexes) {
  if (!liveIndexNames.has(index.name)) statements.push(index.sql);
}

if (statements.length > 0) {
  console.log(`[migrate-app-db] applying ${statements.length} change(s):`);
  const run = live.transaction(() => {
    for (const sql of statements) {
      console.log(`  ${sql}`);
      live.exec(sql);
    }
  });
  run();
} else {
  console.log("[migrate-app-db] schema already up to date");
}

template.close();
live.close();
