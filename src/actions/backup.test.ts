import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// A dedicated on-disk SQLite file for this test suite, kept separate from the
// dev/app database so we never touch real user data. Must be set before any
// module that reads process.env.DATABASE_URL (src/lib/prisma.ts) is imported.
const REPO_ROOT = path.join(__dirname, "../..");
const TEST_DB_PATH = path.join(REPO_ROOT, ".vitest-backup-test.db");
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;

function cleanupDbFiles() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}

let prisma: typeof import("@/lib/prisma").prisma;
let exportAppData: typeof import("./backup").exportAppData;
let importAppData: typeof import("./backup").importAppData;

beforeAll(async () => {
  cleanupDbFiles();
  execSync("npx prisma db push --accept-data-loss", {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "pipe",
  });

  ({ prisma } = await import("@/lib/prisma"));
  ({ exportAppData, importAppData } = await import("./backup"));
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupDbFiles();
});

async function wipeAllTables() {
  await prisma.tokenUsage.deleteMany();
  await prisma.resumeSnapshot.deleteMany();
  await prisma.job.deleteMany();
  await prisma.coverLetter.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.aTSAnalysis.deleteMany();
  await prisma.customization.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.profile.deleteMany();
}

describe("backup export/import", () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it("round-trips data through export -> mutate -> import, preserving ids and relationships", async () => {
    const now = new Date().toISOString();

    const profile = await prisma.profile.create({
      data: {
        label: "Original Profile",
        name: "Jane Doe",
        email: "jane@example.com",
        createdAt: now,
        updatedAt: now,
      },
    });

    const company = await prisma.company.create({
      data: { name: "Acme Corp" },
    });

    const customization = await prisma.customization.create({
      data: {
        template: "modern-minimal",
        fontSize: "medium",
        pageFormat: "Letter",
        fontFamily: "Inter",
        lineHeight: "normal",
        marginSize: "1,1,1,1",
      },
    });

    const resume = await prisma.resume.create({
      data: {
        contentJson: JSON.stringify({ header: { name: "Jane Doe" } }),
        customizationId: customization.id,
      },
    });

    const job = await prisma.job.create({
      data: {
        role: "Senior Engineer",
        description: "Build things.",
        jobDetailsJson: JSON.stringify({}),
        companyId: company.id,
        resumeId: resume.id,
        profileId: profile.id,
      },
    });

    const backup = await exportAppData();

    expect(backup.version).toBe(1);
    expect(backup.data.profiles).toHaveLength(1);
    expect(backup.data.companies).toHaveLength(1);
    expect(backup.data.customizations).toHaveLength(1);
    expect(backup.data.resumes).toHaveLength(1);
    expect(backup.data.jobs).toHaveLength(1);

    // Mutate/wipe the DB to simulate data loss.
    await wipeAllTables();
    expect(await prisma.job.count()).toBe(0);
    expect(await prisma.profile.count()).toBe(0);

    // Round-trip the backup through JSON (as it would be in a real download/
    // upload cycle) before restoring, to exercise Date -> ISO-string -> Date
    // coercion via createMany.
    const reparsedBackup = JSON.parse(JSON.stringify(backup));

    const result = await importAppData(reparsedBackup);
    expect(result).toEqual({ success: true });

    const restoredProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
    });
    expect(restoredProfile?.name).toBe("Jane Doe");
    expect(restoredProfile?.email).toBe("jane@example.com");

    const restoredCompany = await prisma.company.findUnique({
      where: { id: company.id },
    });
    expect(restoredCompany?.name).toBe("Acme Corp");

    const restoredResume = await prisma.resume.findUnique({
      where: { id: resume.id },
    });
    expect(restoredResume?.customizationId).toBe(customization.id);

    const restoredJob = await prisma.job.findUnique({
      where: { id: job.id },
    });
    expect(restoredJob?.companyId).toBe(company.id);
    expect(restoredJob?.resumeId).toBe(resume.id);
    expect(restoredJob?.profileId).toBe(profile.id);
  });

  it("rejects an invalid backup payload without deleting existing data", async () => {
    await prisma.profile.create({
      data: {
        label: "Keep Me",
        name: "Existing User",
        email: "existing@example.com",
      },
    });

    const countBefore = await prisma.profile.count();
    expect(countBefore).toBe(1);

    const result = await importAppData({ version: 2, data: {} });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();

    const countAfter = await prisma.profile.count();
    expect(countAfter).toBe(1);
  });
});
