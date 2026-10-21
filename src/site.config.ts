// Site identity — edit these to rebrand. URL settings (site/base) live in astro.config.mjs.
export const SITE = {
  name: "Xirui's Blog",
  author: 'Xirui Li',
  description: 'Notes on research, engineering, and things I am learning.',
  homepage: 'https://xirui-li.github.io/',
  sourceUrl: 'https://github.com/xirui-li/blog',
  // Icons under the home-page intro. `icon` is one of: link, github, twitter, scholar, rss, mail, linkedin.
  // A url starting with "/" is relative to the site base (e.g. "/rss.xml").
  social: [
    { name: 'Homepage', url: 'https://xirui-li.github.io/', icon: 'link' },
    // { name: 'X', url: 'https://x.com/<handle>', icon: 'twitter' },
    // { name: 'Google Scholar', url: 'https://scholar.google.com/citations?user=<id>', icon: 'scholar' },
    { name: 'RSS', url: '/rss.xml', icon: 'rss' },
    { name: 'GitHub', url: 'https://github.com/xirui-li', icon: 'github' },
  ],
} as const;
