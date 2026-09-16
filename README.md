# D&D Companion

A personal, browser-based D&D 5e / 5.5e (2024) content browser and character builder for iPad.
Non-commercial, personal use only. All content is community-curated from the 5etools dataset
(CC-licensed SRD / fan-content policy), fetched via `scripts/fetch-data.mjs`.

## Content

Everything except monsters: spells, classes & subclasses, class level tables,
feats, races/spices & subraces, backgrounds, equipment & magic items,
conditions, rules reference, and warlock eldritch invocations / optional features.

## Stack

- SvelteKit 5 (runes), Tailwind CSS v4
- Static export via `@sveltejs/adapter-static` (SPA fallback for `/search`)
- PWA-ready: manifest + service worker (cache-first)

## Develop

```sh
npm install
npm run dev
```

## Rebuild data (re-fetch from 5etools mirror)

```sh
npm run fetch-data
```

## Build & preview (static output in `build/`)

```sh
npm run build
npm run preview    # serve build/ on your LAN, e.g. for your iPad
```

Deploy `build/` to any static host (GitHub Pages, Netlify, nginx, etc.).

## Notes

- Content is limited to openly licensed / fan-policy data; dnd-portal and dnd5e.wikidot
  are NOT used because their material is not licensed for reuse.
- Duplicate spells/invocations across editions are deduped, preferring the 2024 (XPHB) text.