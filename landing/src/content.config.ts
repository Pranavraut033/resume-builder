import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { docsLoader } from "./lib/docsLoader";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Renders README.md's "Download & Install" section and docs/MCP.md — both
// already in the repo — straight into the landing page, instead of linking
// out to GitHub. See src/lib/docsLoader.ts.
const docs = defineCollection({
  loader: docsLoader(),
  schema: z.object({}),
});

export const collections = { blog, docs };
