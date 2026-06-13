import { defineConfig, env } from "prisma/config";
import "dotenv/config"; // loads .env

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
