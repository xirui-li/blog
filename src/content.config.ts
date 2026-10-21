import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Each post lives in its own folder: src/content/posts/<slug>/index.mdx.
// Components used by only one post sit next to its index.mdx.
const posts = defineCollection({
  loader: glob({
    pattern: '*/index.{md,mdx}',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // An author is a name, or { name, url, mark } — `mark` (e.g. "*") is explained by `authorNote`.
    authors: z
      .array(z.union([z.string(), z.object({ name: z.string(), url: z.string().url().optional(), mark: z.string().optional() })]))
      .default([]),
    authorNote: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // Side-panel 3D model for the whole post (see MODELS in src/lib/scene3d.ts).
    // Omit to cycle through models section by section.
    scene: z.string().optional(),
    // Drafts render in `npm run dev` but are left out of production builds.
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
