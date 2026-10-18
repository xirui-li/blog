# Xirui's blog

Source for <https://xirui-li.github.io/blog/>, built with [Astro](https://astro.build) + MDX and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Develop

Requires Node ≥ 22.22 (`nvm use` picks it up from `.nvmrc`).

```sh
npm install
npm run dev       # http://localhost:4321/blog/ — drafts are visible here
npm run build     # production build into dist/ — drafts are excluded
npm run preview   # serve dist/ locally
```

One-time GitHub setup: **Settings → Pages → Source: GitHub Actions**.

## Layout

```
src/
├── site.config.ts             # site name, author, description, source link
├── content.config.ts          # post schema (title, description, date, draft, …)
├── content/posts/<slug>/
│   ├── index.mdx              # the post; URL is /blog/posts/<slug>/
│   └── *.astro / images       # components and assets used only by this post
├── components/                # shared components: Figure, Video
├── layouts/                   # Base (site chrome), Post (article header + TOC)
├── pages/                     # index (post list), posts/[slug] (post route)
├── lib/posts.ts               # getPosts(), withBase(), formatDate()
└── styles/global.css          # theme tokens (light/dark) and article typography
public/
└── videos/<slug>/             # video files, served as-is
```

## Writing a post

Create `src/content/posts/<slug>/index.mdx`:

```mdx
---
title: 'Post title'
description: 'One-sentence summary used on the index and in link previews.'
date: 2026-10-16
authors: ['Your Name']
tags: ['notes']
draft: true          # remove when ready to publish
---

import Video from '../../../components/Video.astro';
import MyWidget from './MyWidget.astro';

<Video src="videos/<slug>/rollout.mp4" poster="videos/<slug>/rollout.jpg" caption="…" />
<MyWidget />
```

`src/content/posts/components-demo/` is a draft-only reference page that shows every building block.

### Video

`<Video src poster caption mode wide />` — `src`/`poster` are paths under `public/` or absolute URLs.
`mode="player"` (default) shows controls; `mode="ambient"` is a muted autoplay loop for short rollouts.

Encode for the web before committing:

```sh
ffmpeg -i in.mov -c:v libx264 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart -an out.mp4
```

GitHub rejects files over 100 MB and Pages sites should stay under 1 GB. For larger collections, host the files elsewhere and pass absolute URLs, or track `public/videos/**` with Git LFS (the deploy workflow already checks out LFS files).

### Interactive components

Write an `.astro` component with markup, a scoped `<style>`, and a `<script>` (bundled automatically). Wrapping the behavior in a custom element keeps multiple instances on one page independent — see `src/content/posts/components-demo/Counter.astro`.

For React/Svelte/Vue components, run `npx astro add react` (etc.) and hydrate with `client:visible`.
