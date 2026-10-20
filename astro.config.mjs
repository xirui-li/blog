// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import review from './src/integrations/review.mjs';

// Served as a GitHub Pages project site: https://xirui-li.github.io/blog/
// For a user site (repo named <user>.github.io), drop `base`.
export default defineConfig({
  site: 'https://xirui-li.github.io',
  base: '/blog',
  trailingSlash: 'ignore',
  // review(): dev-only comment API for draft review (see src/components/ReviewMode.astro).
  integrations: [mdx(), review()],
  // three.js (side-panel scene) is one large lazily loaded chunk, by design.
  vite: { build: { chunkSizeWarningLimit: 800 } },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
