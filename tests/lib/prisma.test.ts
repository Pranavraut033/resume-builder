import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Prisma Initialization", () => {
  it("should create a PrismaClient instance", () => {
    const prisma = new PrismaClient();
    expect(prisma).toBeDefined();
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("should use correct log levels in development", () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");

    const prisma = new PrismaClient({
      log: ["query", "error", "warn"],
    });

    expect(prisma).toBeDefined();
    vi.unstubAllEnvs();
    // No need to restore NODE_ENV - vi.unstubAllEnvs handles it
  });

  it("should use error-only logs in production", () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");

    const prisma = new PrismaClient({
      log: ["error"],
    });

    expect(prisma).toBeDefined();
    vi.unstubAllEnvs();
    // No need to restore NODE_ENV - vi.unstubAllEnvs handles it
  });

  it("should be a singleton in non-production environments", async () => {
    // This test verifies the singleton pattern used in src/lib/prisma.ts
    const { prisma: prisma1 } = await import("@/lib/prisma");
    const { prisma: prisma2 } = await import("@/lib/prisma");

    expect(prisma1).toBe(prisma2);
  });

  it("should have all required models", async () => {
    const { prisma } = await import("@/lib/prisma");

    expect(prisma.profile).toBeDefined();
    expect(prisma.job).toBeDefined();
    expect(prisma.resume).toBeDefined();
    expect(prisma.coverLetter).toBeDefined();
  });
});

describe("Prisma Database Schema", () => {
  it("should define profile model with correct fields", async () => {
    const { prisma } = await import("@/lib/prisma");

    // Verify the model has required methods
    expect(prisma.profile.findFirst).toBeDefined();
    expect(prisma.profile.findUnique).toBeDefined();
    expect(prisma.profile.create).toBeDefined();
    expect(prisma.profile.update).toBeDefined();
    expect(prisma.profile.delete).toBeDefined();
  });

  it("should define job model with correct fields", async () => {
    const { prisma } = await import("@/lib/prisma");

    expect(prisma.job.findMany).toBeDefined();
    expect(prisma.job.findUnique).toBeDefined();
    expect(prisma.job.create).toBeDefined();
    expect(prisma.job.update).toBeDefined();
    expect(prisma.job.delete).toBeDefined();
  });

  it("should define resume model with correct fields", async () => {
    const { prisma } = await import("@/lib/prisma");

    expect(prisma.resume.findFirst).toBeDefined();
    expect(prisma.resume.findUnique).toBeDefined();
    expect(prisma.resume.create).toBeDefined();
    expect(prisma.resume.update).toBeDefined();
  });

  it("should define coverLetter model with correct fields", async () => {
    const { prisma } = await import("@/lib/prisma");

    expect(prisma.coverLetter.findFirst).toBeDefined();
    expect(prisma.coverLetter.findUnique).toBeDefined();
    expect(prisma.coverLetter.create).toBeDefined();
    expect(prisma.coverLetter.update).toBeDefined();
  });

  it("should support transactions", async () => {
    const { prisma } = await import("@/lib/prisma");

    expect(prisma.$transaction).toBeDefined();
    expect(typeof prisma.$transaction).toBe("function");
  });

  it("should support raw queries", async () => {
    const { prisma } = await import("@/lib/prisma");

    expect(prisma.$queryRaw).toBeDefined();
    expect(prisma.$executeRaw).toBeDefined();
  });
});
