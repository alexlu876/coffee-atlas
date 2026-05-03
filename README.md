# Coffee Atlas

A specialty coffee atlas — producer profiles, region pages, a coffee-belt-restricted map, and (eventually) a trace-forward graph from producer to roaster to cafe. Live at **[coffee.figtre.es](https://coffee.figtre.es)**.

Spec: [docs/SPEC.md](docs/SPEC.md).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) on **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Auto-deploys from `main` via Workers Builds.
- **Postgres** ([Neon](https://neon.tech)) with **PostGIS** for geo queries. **Drizzle** ORM + `drizzle-kit` for migrations.
- **MapLibre GL** with a Carto Positron basemap.
- **Editorial content** in MDX files under `content/`, parsed with `gray-matter`, validated with `zod`, synced to Postgres via a build-time script. Bodies render as markdown via `react-markdown` (no inline JSX — Cloudflare Workers blocks runtime code-gen, so `next-mdx-remote` is out).

## Local setup

```bash
npm install
```

Create `.dev.vars` (gitignored) with the Neon connection string:

```
NEXTJS_ENV=development
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
```

One-time DB setup (enables PostGIS):

```bash
npm run db:init
```

Apply schema migrations and load content:

```bash
npm run db:migrate
npm run content:sync
```

Run dev server:

```bash
npm run dev
```

## Content workflow

Editorial content lives as MDX files under `content/`:

```
content/
├── countries/colombia.mdx
├── regions/cauca.mdx
├── sub-regions/piendamo.mdx
├── producers/diego-bermudez.mdx
└── estates/finca-el-paraiso.mdx
```

Each file's filename must match its frontmatter `slug`. Frontmatter is validated against Zod schemas in `lib/content.ts`; bodies are stored as markdown in the `*_md` columns.

After editing MDX:

```bash
npm run content:sync
```

The sync is idempotent (`ON CONFLICT (slug) DO UPDATE`) and runs as a single Postgres transaction. It warns on:
- frontmatter slug references that point to MDX files that don't exist (e.g. a producer's `estates: [...]` listing an estate without a file)
- orphan rows in the DB (rows whose MDX file has been deleted) — does not auto-delete; prints the SQL to remove them

## Schema changes

Edit `db/schema.ts`, then:

```bash
npm run db:generate    # produces drizzle/NNNN_*.sql
npm run db:migrate     # applies pending migrations to Neon
```

Migrations are checked in for audit trail.

## Deploy

The default Workers Builds build command is `npx opennextjs-cloudflare build`. This deploys the Worker but **does not** run migrations or sync content — those are manual steps run before pushing.

To make CI auto-migrate and auto-sync content, switch the Workers Builds build command to:

```
npm run ci:build
```

…and add `DATABASE_URL` as a *build* environment variable in the Workers Builds dashboard (Settings → Builds → Environment variables). It's currently only set as a runtime secret on the Worker itself.

## File structure

```
app/                       # Next.js App Router pages
  [country]/               # /colombia
  [country]/[region]/      # /colombia/cauca
  [country]/[region]/[subRegion]/
  producers/[slug]/        # /producers/diego-bermudez
  atlas/                   # MapLibre map
  sitemap.ts               # generated from DB
components/
  atlas-map.tsx            # client component, MapLibre
  site-footer.tsx
content/                   # MDX source-of-truth (committed)
db/
  schema.ts                # Drizzle schema, 19 tables
docs/SPEC.md               # canonical project spec
drizzle/                   # generated migrations + snapshots
lib/
  content.ts               # Zod schemas + MDX loader
  db.ts                    # Drizzle client over Neon HTTP
  mdx.tsx                  # markdown renderer (react-markdown)
scripts/
  init-db.ts               # CREATE EXTENSION postgis
  migrate.ts               # apply pending drizzle migrations
  smoke-db.ts              # report postgres + postgis versions, list tables
  sync-content.ts          # walk content/, validate, upsert into Postgres
wrangler.jsonc             # Cloudflare Worker config
```

## Notes / known gaps

- **`geometry(point)` not `geography(Point, 4326)`.** The spec calls for sphere-correct geography; Drizzle's `customType` has a quoting bug with parens in the type, and the built-in `geometry()` doesn't include SRID. For v0 with viewport-bbox queries this is fine. Migrate columns when sphere-distance becomes load-bearing.
- **No JSX in MDX bodies.** Spec sample shows `<EstateMap />` etc.; Workers blocks runtime code-gen (`new Function()`), which is what `next-mdx-remote` uses to hydrate compiled MDX. Producer profiles with embedded components will need build-compiled MDX via `@next/mdx` (file-system routing per slug, not DB-stored bodies).
- **`competition_results.id` is a synthetic serial PK.** Spec's composite PK had a nullable column, which Postgres rejects.
- **Three producer profiles, not the spec's ~30 target.** Editorial volume is the next big chunk.
