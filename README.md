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
├── site.config.ts             # site name, author, description, homepage, source link
├── content.config.ts          # post schema (title, description, date, draft, …)
├── content/posts/<slug>/
│   ├── index.mdx              # the post; URL is /blog/posts/<slug>/
│   └── *.astro / images       # components and assets used only by this post
├── components/                # shared components: Figure, Video, Diagram
├── layouts/                   # Base (site chrome), Post (article header + TOC)
├── pages/                     # index (post list), posts/[slug] (post route)
├── lib/posts.ts               # getPosts(), withBase(), formatDate()
├── lib/diagram.ts             # Diagram palette, node shapes, edge routing
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
scene: robot_arm     # optional: one 3D model in the side panel for the whole post
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

### Figures and diagrams

`<Figure title="Short title." caption="Longer description." wide>` gives a paper-style caption — "**Figure N  Short title.** Longer description." — numbered automatically in page order.

`<Diagram>` draws box-and-arrow figures in the style of Meta research papers (SVG, no JavaScript):

```mdx
import Figure from '../../../components/Figure.astro';
import Diagram from '../../../components/Diagram.astro';

<Figure wide title="Pipeline." caption="What the reader should take away.">
  <Diagram
    width={960} height={200}
    groups={[{ x: 10, y: 40, w: 940, h: 150, label: 'Stage 1' }]}
    nodes={[
      { id: 'a', x: 40, y: 80, w: 170, h: 60, label: 'Data\nSource', kind: 'source' },
      { id: 'b', x: 300, y: 80, w: 170, h: 60, label: 'Model', kind: 'model' },
    ]}
    edges={[{ from: 'a', to: 'b', label: 'train' }]}
  />
</Figure>
```

- Coordinates are viewBox units; the SVG scales to the column (use `wide` for anything over ~700 units).
- Node `kind` (color): `model` teal · `engine` yellow · `source` purple · `decoder` blue · `mesh` green · `splat` peach · `neutral` · `tag` peach pill · `dark` · `go` · `gray` · `plain`.
- Node `shape`: `box` · `pill` · `trapezoid` · `tokens` (`count`) · `image` (`src`) · `text`.
- Edges route automatically with rounded corners. Override with `fromSide`/`toSide`, `fromAt`/`toAt` (0–1 along the side), `mid`, or explicit `via` waypoints; add `label`, `labelAt`, `dashed`.
- Groups: dashed boxes with a `top` label ("STAGE 1") or `labelPos: 'bracket'` ("[ GEOMETRY MODEL ]"); `variant: 'filled'` for a gray backdrop.
- `legend={{ x, y, direction: 'row', items: [{ kind: 'model', label: 'Model Training' }] }}`.
- `animate` sends a token along the edges at constant speed, in `step` order (edges sharing a step move together), pulsing each node on arrival. Off under reduced motion.

See the Diagrams section of `components-demo` for a full recreation of a paper figure.

### Layout and the 3D side panel

On screens wider than 900px, post pages split like lego-anything.com (the home page stays a single centered column): a fixed left third (`.side-panel` in `Base.astro`) and the reading column in the right two thirds. The side panel holds only the 3D scene.

The scene (`src/lib/scene3d.ts`) renders white, procedurally built buildings — `pagoda`, `lighthouse`, `temple`, `observatory`, `windmill`, `temple_of_heaven`, plus an animated pick-and-place `robot_arm` — that rotate as you scroll. Each `##` section of a post crossfades to the next model, unless the post sets `scene: <name>` in its frontmatter to keep one model throughout. three.js is loaded only on wide screens. Add `?scene=<name>` to any URL to preview a specific model; add a new model by adding a builder to `MODELS`.

### Interactive components

Write an `.astro` component with markup, a scoped `<style>`, and a `<script>` (bundled automatically). Wrapping the behavior in a custom element keeps multiple instances on one page independent — see `src/content/posts/components-demo/Counter.astro`.

For React/Svelte/Vue components, run `npx astro add react` (etc.) and hydrate with `client:visible`.
