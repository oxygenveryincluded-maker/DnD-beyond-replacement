# D&D Companion

A personal, browser-based D&D 5e / 5.5e (2024) content browser and character
builder. The site itself is public; email login is only used for optional cloud
sync. Non-commercial, personal use only.

## Features

- **Browse** spells, classes & subclasses, feats, races/lineages, backgrounds,
  equipment, magic items, conditions/rules, and warlock invocations / optional
  features. Includes search, 5E / 5.5E edition toggles, source legends, and a
  homebrew toggle.
- **Character builder** with class/race/background/feat selection, ability
  scores, skills, equipment, and spells grouped by level and filtered by class.
- **Combat tab** with attacks, actions, spell slots, spell cards, eldritch
  invocations (including user-defined custom invocations), and a standard 5e
  printable character sheet.
- **Cloud sync** (optional): email/password accounts backed by Supabase, with
  merge-by-name and most-recent-wins conflict handling.
- **Local backups**: download/restore every character as plain JSON from the
  Home page.

## Stack

- SvelteKit 5 (runes) + TypeScript
- Tailwind CSS v4
- Static export via `@sveltejs/adapter-static` (SPA fallback)
- Supabase (Auth + Postgres) for optional cloud sync

## Develop

```sh
npm install
npm run dev
```

Type-check and build:

```sh
npm run check
npm run build
```

The production build defaults to the GitHub Pages subpath
`/DnD-beyond-replacement/`. Override it with `BUILD_BASE`:

```sh
BUILD_BASE= npm run build        # build for the domain root
npm run preview                  # serve build/ on the LAN (e.g. for an iPad)
```

## Data

Content lives in `src/lib/data/*.json`.

- `scripts/fetch-data.mjs` rebuilds the core dataset from the
  5etools mirror (spells, classes, subclasses, feats, races, backgrounds,
  equipment, magic items, conditions, optional features, search index).
- `scripts/parse-wikidot-spells.mjs` builds `spell-classes.json` (per-spell
  class lists) from a local dnd5e.wikidot page dump. Set `WIKIDOT_SRC` or place
  the dump in `scripts/wikidot-src/ExampleRepo2/` (git-ignored).
- `scripts/parse-wikidot.mjs` + `scripts/merge-wikidot.mjs` import the extra
  homebrew / wiki material used by the homebrew toggle.
- `scripts/build-classes.mjs` rebuilds only the official class/subclass tables.

## Cloud sync setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Paste the project URL and anon key into `src/lib/config.ts`.
3. Configure custom SMTP (MailerSend) in Supabase Auth for confirmation emails.
4. Run `supabase/keepalive.sql` once and keep
   `.github/workflows/keepalive.yml` enabled so the free project is not paused
   for inactivity.

Without cloud credentials the app still works fully offline; characters are
stored in `localStorage`.

## Backups

```sh
npm run backup                   # ~/backups/dnd-companion-<timestamp>.{tar.gz,bundle}
```

The script writes a source snapshot (without `node_modules`, `.svelte-kit`,
`build`) and a complete git bundle. Restore the code with:

```sh
git clone dnd-companion-<timestamp>.bundle repo
tar -xzf dnd-companion-<timestamp>.tar.gz -C repo
```

## Deploy

Pushing to `main` builds the site and publishes `build/` to the `gh-pages`
branch via `.github/workflows/deploy.yml`:

<https://oxygenveryincluded-maker.github.io/DnD-beyond-replacement/>

Assets are cached for 10 minutes; hard-refresh after a deploy.
