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
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
