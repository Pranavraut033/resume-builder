import { beforeAll, afterAll, vi } from "vitest";

// Mock Tauri APIs
beforeAll(() => {
  // Mock Tauri store API
  global.window = global.window || ({} as unknown);

  vi.mock("@tauri-apps/plugin-store", () => ({
    Store: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      save: vi.fn(),
    })),
  }));

  // Mock Tauri plugin stronghold
  vi.mock("@tauri-apps/plugin-stronghold", () => ({
    Client: vi.fn(),
    Store: vi.fn(),
  }));
});

afterAll(() => {
  vi.clearAllMocks();
});
