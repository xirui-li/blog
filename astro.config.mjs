// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Served as a GitHub Pages project site: https://xirui-li.github.io/blog/
// For a user site (repo named <user>.github.io), drop `base`.
export default defineConfig({
  site: 'https://xirui-li.github.io',
  base: '/blog',
  trailingSlash: 'always',
  integrations: [mdx()],
  // three.js (side-panel scene) is one large lazily loaded chunk, by design.
  vite: { build: { chunkSizeWarningLimit: 800 } },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
