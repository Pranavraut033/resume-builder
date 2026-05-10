import { beforeAll, afterAll, vi } from "vitest";

// Mock Tauri APIs at module level so they are properly hoisted
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock("@tauri-apps/plugin-stronghold", () => ({
  Client: vi.fn(),
  Store: vi.fn(),
}));

beforeAll(() => {
  global.window = global.window || ({} as unknown);
});

afterAll(() => {
  vi.clearAllMocks();
});
