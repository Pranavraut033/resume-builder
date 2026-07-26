import { defineConfig } from "prisma/config";
import "dotenv/config"; // loads .env

// ponytail: fall back instead of env()'s hard throw — callers like
// prepareTauriServer.mjs pass their own --url and don't need this value set.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
