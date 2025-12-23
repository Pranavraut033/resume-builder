import { vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

// Create a deep mock of PrismaClient
export const prismaMock =
  mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Reset mocks before each test
export function resetPrismaMock() {
  mockReset(prismaMock);
}
