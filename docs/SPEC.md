# Specialty Coffee Atlas — Project Spec

A handoff document for Claude Code. Read this fully before starting work.

---

## 1. Project Overview

A specialty coffee profiling and discovery website. Two core features:

1. **Producer map & profiles** — a coffee-belt-restricted world map where every meaningful specialty coffee producer (farmer, family, washing station) has a richly detailed profile. Think Atlas Obscura for coffee origins, not Wikipedia for coffee.
2. **Cafe map** — a city-by-city map of specialty coffee shops, with a "specialty only" filter that surfaces only third-wave-quality cafes (defined by which roasters they serve, not by self-identification).

The two systems connect through a **trace-forward graph**: pick a producer (e.g. Diego Bermudez), see every roaster currently carrying their lots, see every cafe in your covered cities currently brewing those roasters' coffee. This is the differentiator. No existing site does this well.

### What this is NOT

- **Not a coffee bag scanner / shopping app** like Siip Coffee. We're not selling beans or matching products.
- **Not a Google Maps clone for cafes** like Beanhunter. Quality curation is the moat.
- **Not a dry database** like The Bean Geek. Editorial richness is the product.
- **Not a B2B traceability tool** like Sourcemap or Open Supply Hub. This is for enthusiasts.

### Audience

Specialty coffee enthusiasts who already know roasters like Sey, Hydrangea, Black & White, Onyx, Tim Wendelboe, La Cabra, April. They want to understand the origins of their favorite beans deeply, and want to find equivalent quality wherever they travel.

### Domain

`figtre.es` is currently registered (Cloudflare Pages + GitHub workflow already in place). Could be the home for this project or it could get its own domain — TBD.

---

## 2. The Differentiator: Editorial + Trace-Forward

The two things that make this project worth building over what already exists:

**Editorial richness.** Every producer gets a long-form story. Diego Bermudez's page should explain the bioreactors and the thermal shock technique and the brother dynamic with Alex; Jairo Arcila's page should tell the story of his 40 years as a mill manager and how his sons came back from Australia and started Cofinet. These are not bullet-point Wikipedia stubs. They are the kind of writing someone forwards to a coffee-nerd friend.

**Trace-forward.** When I'm reading about Diego Bermudez I should see, on the same page: which roasters in the US are currently carrying his lots, which cafes in NYC (and other covered cities) are currently brewing those roasters' coffee, and a "notify me" option for new lots. This sentence should exist somewhere on the site, dynamically generated:

> "This week, you can drink Diego Bermudez's Wush Wush at Sey, Devoción, and Variety in NYC."

That sentence does not exist anywhere on the internet right now.

---

## 3. Scope Decisions

### Big infrastructure, narrow content

Build the data model, taxonomy, URL structure, and map system to handle 50,000 producers and 100 cities from day one. Populate with Colombia + NYC initially.

### Coffee-belt-restricted producer map

Producers only exist between ~30°N and ~30°S. Restrict the viewport. The visible canvas is content; oceans and tundra are not. This is also an educational moment — most users don't internalize that this is a tropics-only beverage until they see it laid out.

### Hierarchy is part of the experience

Country → Region → Sub-region → Estate → Producer → Lot. Every level deserves its own page with editorial content. "Why does Cauca taste different from Huila?" should be a real page, not a tooltip.

### Editorial-first, schema-second

The schema serves the writing, not the other way around. Markdown (MDX) files in Git for prose; Postgres for relational queries.

### Start: Colombia (producers) + NYC (cafes)

~30 Colombia producers in v0, ~80–120 NYC cafes in v0.5. Geographic depth before geographic breadth.

---

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | SSR for SEO (huge for a content site), great Cloudflare Pages support, MDX-friendly. |
| Database | **Postgres + PostGIS** via Neon | Real relational graph; PostGIS handles geo queries (point-in-polygon, distance, viewport bbox). |
| Maps | **MapLibre GL JS** | Open-source Mapbox GL fork. No per-load fees. Vector tiles via Protomaps or self-hosted on R2. |
| Hosting | **Cloudflare Pages** | Already in use. Free tier is generous. |
| Storage | **Cloudflare R2** | Cheap object storage for producer/farm photos. Cloudflare Images for transformations later. |
| Content | **MDX in Git** | Long-form prose with embedded React components. Version-controlled. PR-friendly for community contributions later. |
| Search (later) | Postgres full-text → Typesense if it scales | Don't optimize early. |
| Auth (later) | Clerk or Auth.js | Only needed when adding user features. |

### Why not Cloudflare D1?

Tempting given the existing Cloudflare workflow, but:
- No PostGIS equivalent. Geographic queries are central.
- The relational graph (producers ↔ lots ↔ roasters ↔ cafes) genuinely benefits from a real Postgres.
- Neon's serverless Postgres works fine with Cloudflare Workers if compute colocation matters later.

### Why MDX for editorial content?

- Long-form prose lives in `.mdx` files in the repo, one per producer / estate / region / country.
- Frontmatter contains structured fields (slug, lat, lng, parent_region, etc.).
- Body is prose with embedded React components (image galleries, mini-maps, tasting note cards).
- At build time, frontmatter is parsed into Postgres rows. MDX bodies render as HTML.
- Benefits: Git history of every edit, PR-based workflow, editorial richness without CMS overhead.

---

## 5. Data Model

The full schema in pseudo-DDL. Implement as Postgres tables; use PostGIS types where noted.

### Geography

```sql
countries (
  slug              text PRIMARY KEY,         -- 'colombia'
  name              text NOT NULL,
  iso_code          text UNIQUE,              -- 'CO'
  description_md    text,                     -- pulled from MDX body
  coffee_history_md text,
  total_production_bags int,                  -- denormalized stat
  hero_image_url    text,
  centroid          geography(Point, 4326)
)

regions (                                     -- e.g. Cauca, Huila, Sidama, Boquete
  slug          text PRIMARY KEY,             -- 'cauca'
  country_slug  text REFERENCES countries(slug),
  name          text NOT NULL,
  centroid      geography(Point, 4326),
  geo_polygon   geography(Polygon, 4326),     -- for map shading
  altitude_min  int,
  altitude_max  int,
  typical_processes  text[],                  -- ['washed', 'natural', 'thermal_shock']
  typical_varieties  text[],                  -- ['gesha', 'pink_bourbon', 'castillo']
  description_md text,
  UNIQUE (country_slug, slug)
)

sub_regions (                                 -- e.g. Piendamó, Inzá, Bensa, Volcán
  slug         text PRIMARY KEY,
  region_slug  text REFERENCES regions(slug),
  name         text NOT NULL,
  centroid     geography(Point, 4326),
  description_md text,
  UNIQUE (region_slug, slug)
)
```

### People & places

```sql
producers (                                   -- the human/family entity
  slug             text PRIMARY KEY,          -- 'diego-bermudez'
  primary_name     text NOT NULL,             -- 'Diego Samuel Bermudez'
  alt_names        text[],
  bio_md           text,                      -- pulled from MDX body
  generation       int,                       -- 1, 2, 3rd-gen grower
  year_started     int,
  hero_image_url   text,
  is_collective    boolean DEFAULT false,     -- coop vs individual
  family_member_slugs text[]                  -- self-referential
)

estates (                                     -- farms, washing stations, mills
  slug                  text PRIMARY KEY,     -- 'finca-el-paraiso'
  name                  text NOT NULL,
  type                  text NOT NULL,        -- 'farm' | 'washing_station' | 'mill'
  primary_producer_slug text REFERENCES producers(slug),
  sub_region_slug       text REFERENCES sub_regions(slug),
  location              geography(Point, 4326),
  altitude_min          int,
  altitude_max          int,
  area_hectares         numeric,
  year_founded          int,
  description_md        text,
  notable_lots_md       text,
  hero_image_url        text
)
```

### Coffee taxonomy

```sql
varieties (                                   -- Gesha, Pink Bourbon, Chiroso, Wush Wush
  slug                text PRIMARY KEY,
  name                text NOT NULL,
  alt_names           text[],
  parent_variety_slug text REFERENCES varieties(slug),  -- lineage
  origin_country_slug text REFERENCES countries(slug),
  origin_story_md     text,
  flavor_profile_md   text
)

processes (                                   -- Washed, Natural, Thermal Shock, Ice
  slug                 text PRIMARY KEY,
  name                 text NOT NULL,
  alt_names            text[],
  parent_process_slug  text REFERENCES processes(slug),  -- 'thermal_shock' is-a 'anaerobic'
  description_md       text,
  pioneered_by_producer_slug text REFERENCES producers(slug)  -- Bermudez/thermal shock
)
```

### The temporal entity: lots

```sql
lots (                                        -- one specific harvest's specific coffee
  slug             text PRIMARY KEY,          -- 'diego-bermudez-wush-wush-natural-2024'
  estate_slug      text REFERENCES estates(slug),
  producer_slug    text REFERENCES producers(slug),
  variety_slug     text REFERENCES varieties(slug),
  process_slug     text REFERENCES processes(slug),
  harvest_year     int NOT NULL,
  name             text,                      -- 'Lychee Peach', 'Lot 108'
  sca_score        numeric(4,2),
  tasting_notes    text[],
  altitude_picked  int,
  lot_size_kg      int,
  description_md   text
)
```

### Supply chain entities

```sql
importers (
  slug          text PRIMARY KEY,
  name          text NOT NULL,
  hq_country_slug text REFERENCES countries(slug),
  website       text,
  description_md text
)

roasters (
  slug          text PRIMARY KEY,
  name          text NOT NULL,
  hq_city_slug  text REFERENCES cities(slug),
  website       text,
  philosophy_md text,
  founded_year  int,
  description_md text,
  hero_image_url text
)

cities (
  slug          text PRIMARY KEY,
  country_slug  text REFERENCES countries(slug),
  name          text NOT NULL,
  centroid      geography(Point, 4326)
)

neighborhoods (
  slug          text PRIMARY KEY,
  city_slug     text REFERENCES cities(slug),
  name          text NOT NULL,
  centroid      geography(Point, 4326),
  UNIQUE (city_slug, slug)
)

cafes (
  slug              text PRIMARY KEY,
  name              text NOT NULL,
  neighborhood_slug text REFERENCES neighborhoods(slug),
  address           text,
  location          geography(Point, 4326),
  hours_json        jsonb,
  description_md    text,
  ambiance_notes    text,
  photo_urls        text[]
)
```

### The graph (join tables) — the magic

```sql
producer_importers (                          -- ongoing relationships
  producer_slug text REFERENCES producers(slug),
  importer_slug text REFERENCES importers(slug),
  since_year    int,
  is_primary    boolean,
  PRIMARY KEY (producer_slug, importer_slug)
)

roaster_lots (                                -- which roasters carried which lot
  roaster_slug   text REFERENCES roasters(slug),
  lot_slug       text REFERENCES lots(slug),
  first_seen_at  timestamptz,
  last_seen_at   timestamptz,
  status         text,                        -- 'active' | 'sold_out' | 'historical'
  product_url    text,
  retail_price_usd numeric,
  PRIMARY KEY (roaster_slug, lot_slug)
)

cafe_roasters (                               -- durable cafe-roaster relationships
  cafe_slug    text REFERENCES cafes(slug),
  roaster_slug text REFERENCES roasters(slug),
  is_primary   boolean,                       -- house roaster vs guest
  notes_md     text,
  PRIMARY KEY (cafe_slug, roaster_slug)
)

cafe_lots (                                   -- the magic: currently brewing
  cafe_slug      text REFERENCES cafes(slug),
  lot_slug       text REFERENCES lots(slug),
  format         text,                        -- 'filter' | 'espresso' | 'both'
  status         text,
  first_seen_at  timestamptz,
  last_seen_at   timestamptz,
  PRIMARY KEY (cafe_slug, lot_slug)
)
```

### Competitions (context layer)

```sql
competitions (                                -- CoE Colombia 2023, Best of Panama 2025
  slug         text PRIMARY KEY,
  name         text NOT NULL,
  country_slug text REFERENCES countries(slug),
  year         int NOT NULL,
  type         text                           -- 'cup_of_excellence' | 'best_of_panama' | etc
)

competition_results (
  competition_slug text REFERENCES competitions(slug),
  producer_slug    text REFERENCES producers(slug),
  lot_slug         text REFERENCES lots(slug),  -- nullable
  rank             int,
  score            numeric(4,2),
  lot_name_at_competition text,
  PRIMARY KEY (competition_slug, producer_slug, lot_slug)
)
```

### Key design decisions

- **Slugs as primary keys.** URL routing matters enormously for SEO. `figtre.es/colombia/cauca/diego-bermudez/finca-el-paraiso` is what Google rewards. Don't use UUIDs in URLs.
- **`Estate` not separate `Farm` and `WashingStation`.** Latin American producers tend to own farms with on-site processing; African producers more often deliver to central washing stations. One table with a `type` field handles both.
- **`Lot` as temporal entity.** A lot is "Diego Bermudez's 2024 Wush Wush Natural" — defined by farm + producer + variety + process + harvest year. New harvest = new row. Enables history.
- **Three separate join tables for the supply graph.** `cafe_roasters` is durable (manually curated); `roaster_lots` is mostly scraped; `cafe_lots` is the high-signal exception layer for explicit features ("Variety Coffee is brewing this Wush Wush this week").
- **`description_md` everywhere.** Editorial richness is the product. These fields are populated from MDX bodies at build time.

---

## 6. URL Structure

```
/                                              # landing
/atlas                                         # the producer world map
/cafes                                         # the cafe finder (multi-city later)
/cafes/nyc                                     # NYC cafe map

/[country-slug]                                # e.g. /colombia
/[country-slug]/[region-slug]                  # /colombia/cauca
/[country-slug]/[region-slug]/[sub-region-slug] # /colombia/cauca/piendamo
/producers/[producer-slug]                     # /producers/diego-bermudez
/producers/[producer-slug]/[estate-slug]       # /producers/diego-bermudez/finca-el-paraiso
/lots/[lot-slug]                               # /lots/diego-bermudez-wush-wush-natural-2024

/varieties/[variety-slug]                      # /varieties/gesha
/processes/[process-slug]                      # /processes/thermal-shock

/roasters/[roaster-slug]                       # /roasters/sey
/cafes/[city-slug]/[cafe-slug]                 # /cafes/nyc/sey-coffee
/importers/[importer-slug]                     # /importers/cofinet
```

Every page is server-rendered for SEO. Listings (e.g. `/colombia`) generate dynamically from Postgres queries. Detail pages render MDX content + structured data.

---

## 7. Editorial vs Structured Data: The Hybrid

This split is non-negotiable. Get it right early.

### MDX files in Git

Path convention: `content/[type]/[slug].mdx`

```
content/
├── countries/
│   ├── colombia.mdx
│   ├── ethiopia.mdx
│   └── panama.mdx
├── regions/
│   ├── cauca.mdx
│   ├── huila.mdx
│   └── boquete.mdx
├── sub-regions/
│   └── piendamo.mdx
├── producers/
│   ├── diego-bermudez.mdx
│   ├── wilton-benitez.mdx
│   └── jairo-arcila.mdx
├── estates/
│   └── finca-el-paraiso.mdx
├── varieties/
│   ├── gesha.mdx
│   └── pink-bourbon.mdx
├── processes/
│   └── thermal-shock.mdx
├── roasters/
│   └── sey.mdx
└── cafes/
    └── nyc/
        └── sey-coffee.mdx
```

### Sample MDX file: producers/diego-bermudez.mdx

```mdx
---
slug: diego-bermudez
primary_name: Diego Samuel Bermudez
alt_names:
  - Diego Samuel Bermudez Tapia
generation: 1
year_started: 2008
is_collective: false
hero_image_url: /images/producers/diego-bermudez.jpg
estates:
  - finca-el-paraiso
varieties_grown:
  - gesha
  - castillo
  - wush-wush
  - sidra
pioneered_processes:
  - thermal-shock
  - double-anaerobic
---

import { ProducerHero, EstateMap, NotableLots, CurrentlyBrewing } from '@/components/mdx'

<ProducerHero />

Almost certainly the most influential single producer in specialty coffee right now.
Diego and his brother Alex run their farm in Piendamó like a microbiology lab — they
use bioreactors, ozone-sterilize the cherries, inoculate with specific microorganism
strains (often *Lactobacillus*), and developed the now-famous "thermal shock" technique
where coffee gets alternating hot/cold water rinses to lock in volatile aromatics.

## The science

Where most producers use tanks or barrels for anaerobic fermentation, Diego uses
true bioreactors...

<EstateMap estate="finca-el-paraiso" />

## Notable lots

<NotableLots producer="diego-bermudez" />

## Currently brewing

<CurrentlyBrewing producer="diego-bermudez" cities={['nyc']} />
```

### Build pipeline

1. On build, walk `content/**/*.mdx`.
2. Parse frontmatter → upsert into Postgres tables (the `*_md` columns get populated from MDX bodies serialized to HTML).
3. Generate static pages with Next.js for everything that has stable URLs.
4. Dynamic queries (`/atlas` viewport, `currently brewing` badges) hit Postgres directly via Server Components.

---

## 8. Map Architecture

The producer map and the cafe map have different UX needs. They are separate views, not one map with toggles.

### Producer atlas (`/atlas`)

- **Viewport restricted** roughly to 30°N–30°S. Custom basemap that de-emphasizes oceans and non-tropical zones (subtle, neutral, lots of breathing room around coffee regions).
- **Three zoom tiers**:
  - **World view** (low zoom): country-level aggregations. Pin clusters with counts. "Colombia: 47 producers."
  - **Region view** (mid zoom): country expanded, region polygons (PostGIS) shaded. Click to enter region.
  - **Sub-region/estate view** (high zoom): individual estate pins.
- **PostGIS queries** populate based on viewport bbox via API route.
- **Side panel** on click: producer summary, hero image, link to full page.
- **Filters**: variety (multi-select), process (multi-select), elevation range, "currently roasted by [roaster]" (powered by `roaster_lots`).

### Cafe finder (`/cafes/nyc`)

- Standard city basemap (Mapbox-style streets).
- Neighborhood-level clustering at low zoom; individual cafe pins at high zoom.
- **Filters**:
  - Roaster (multi-select)
  - "Specialty only" toggle (cafe is in `cafe_roasters` join with at least one curated specialty roaster)
  - Brew method (filter / espresso / both)
  - Hours (open now)
- Side panel on click: cafe info, roasters served, currently-brewing lots if any.

### The connection between maps lives on pages, not in a single map view

Producer page → "Currently brewing at" → cafe pins inline on a city minimap.
Cafe page → "This week pouring lots from these producers" → mini-pins on a coffee-belt minimap.

---

## 9. Phased Rollout

### v0 — readable prototype (~2–4 weeks)

**Goal:** A site that's better than what currently exists for learning about producers.

- Schema deployed; populate countries, regions, sub-regions, producers, estates only.
- ~30 Colombia producers as MDX files (see Section 10 for seed list).
- Producer atlas (coffee-belt map) with pins for those 30 producers + click-through to producer pages.
- No cafes, no lots, no roasters yet.
- Landing page that explains the project.
- Editorial voice locked in.

**Out of scope for v0:** cafes, lots, roasters, search, user accounts, importers, competitions.

### v0.5 — NYC cafes

**Goal:** "Where can I drink Sey in NYC" works.

- Add `cities`, `neighborhoods`, `cafes`, `roasters` tables.
- Curate ~80–120 NYC specialty cafes manually with the roasters they pour.
- Curate ~30 specialty roasters (Sey, Hydrangea, Black & White, Onyx, Variety, Devoción, Abraço, etc.).
- `/cafes/nyc` map functional.
- Cafe pages with roaster relationships visible.

### v1 — the trace-forward magic

**Goal:** "What's currently brewing where" works end-to-end.

- Add `lots`, `roaster_lots`, `cafe_lots` tables.
- **Roaster scraper** for Sey, Hydrangea, Black & White (their product pages are parseable; respect robots.txt and rate-limit). Scheduled job runs daily.
- Producer pages show "Currently brewing at" with NYC cafe pins.
- Cafe pages show "This week pouring lots from..." with producer minimap pins.
- Add `competitions` and `competition_results` for context (Cup of Excellence Colombia, Best of Panama).

### v1.5+ — second axis

- Second country (Ethiopia OR Panama; Panama probably easier due to concentration).
- Second city (San Francisco / Bay Area is the natural pair to NYC; lots of overlap with Sey/Hydrangea/CoRo).
- Importer partnerships (Cofinet, Trabocca, Osito, Falcon, Red Fox) for cleaner producer data and direct feeds.
- User accounts for "favorite producers" + new-lot notifications.
- Open contribution model for editorial content (PRs to MDX files).
- API for other apps to consume the producer database.

---

## 10. Seed Content: Colombia Producers (v0)

This is your starting list of ~30 producers. We've gathered substantial info on these from our research. Each gets an MDX file in `content/producers/`. The most-developed profiles to lead with are marked **★**.

### Cauca region

**★ Diego Bermudez** — Finca El Paraíso, Piendamó.
- Most influential single producer in specialty coffee right now. Bioreactor-based fermentation, thermal shock technique. Founded 2008 with brother Alex. Famous lots: "Lychee Peach" (Castillo), "Lychee" (Wush Wush), Gesha "Letty." Set auction records. Co-founded Hachi Coffee Project. Works with The Coffee Quest as primary importer.
- Process pioneered: thermal shock, double anaerobic.
- Varieties: Castillo, Gesha, Wush Wush, Sidra.

**★ Wilton Benitez** — Granja Paraíso 92, La Macarena, Las Brisas. Piendamó.
- Chemical engineer turned coffee producer. Three farms. Thermal shock + UV/ozone sterilization. Grows 25+ varieties including Sudan Rume, Eugenoides, Java, Wush Wush, Pink Bourbon, Chiroso.
- Process pioneered: thermal shock with double anaerobic.

**Pablo Guerrero** — Finca El Obraje, Tangua, Nariño (technically Nariño not Cauca but closely associated with the Cauca innovation cluster).
- High-elevation farm with dramatic temperature swings. Gesha planted in 2011. Featured by Black & White.

**Jhon Alexander Bermudez** — Finca La Estrella.
- Different Bermudez family from Diego. Chiroso washed. Currently featured at Sey.

**Wilson Alba** — Sierra Morena.
- Pink Bourbon specialist. Currently at Sey.

### Quindío region

**★ Jairo Arcila** — Esmeralda, Villarazo, Santa Mónica, Maracay, Buenos Aires. Armenia.
- Third-generation grower, 40+ years as mill manager at Colombia's #2 exporter (retired 2019). Wife Luz Helena Salazar is a producer in her own right. Sons Carlos and Felipe founded Cofinet (after a "wait a minute" moment in an Australian café). One of the first 10 Gesha producers in all of Colombia (planted 3000 trees in 2014). Co-developed "Ice fermentation" process. Helped popularize/discover Chiroso variety.
- Importer relationship: Cofinet (family business).
- Varieties: Pink Bourbon, Java, Papayo, Gesha, Sidra, Chiroso.

**Luz Helena Salazar** — La Leona (and others).
- Jairo's wife. Accountant who took over farm management. Producer in her own name.

**Marta Arcila** — La Leona (separate farm).
- Featured by Australian roasters via Cofinet.

### Valle del Cauca region

**Café Granja La Esperanza** — Rigoberto and Luis Eduardo Herrera. Caicedonia.
- One of the older "famous farm" names in Colombia. Early Gesha planters in Colombia. Consistent competition-grade lots.

### Huila region

(Identify 3–5 prominent Huila producers in research phase. Eyder Andrés Martínez is a known processor in Nariño area but useful contact for Huila/Nariño microlot processing.)

### Other Colombia

**Eyder Andrés Martínez** — processor (not strictly a producer; helps neighboring farms with processing infrastructure).
- Featured in Hydrangea's Daiver Mallama lot processing.

**Daiver Mallama** — Nariño.
- Featured by Hydrangea.

---

### Reference content for these MDX files

The conversation that produced this spec contains substantial detail on the top producers above. When writing the MDX bodies:

- **Diego Bermudez** profile should cover: family origins, the chemistry/microbiology approach, the bioreactor setup, thermal shock mechanics, the brother dynamic (Alex), the Hachi project, key award-winning lots ("Lychee," "Lychee Peach," "Letty"), and the current importer relationship with The Coffee Quest.
- **Wilton Benitez** profile should cover: chemical engineering background, the three-farm setup, his UV/ozone sterilization process, the thermal shock variant, his exotic variety obsession (Sudan Rume, Eugenoides, etc.), and the comparison/contrast with Diego Bermudez (both Cauca/Piendamó, both fermentation pioneers, but different stylistic approaches).
- **Jairo Arcila** profile should cover: the 40-year mill manager backstory, family history (Luz Helena, Carlos & Felipe), the Cofinet origin story (Australia trip), the Chiroso variety connection, "Ice fermentation," and his relatively understated processing aesthetic compared to the Cauca pyrotechnics. Should feel like a quiet-craftsman counterpart to the Diego/Wilton profiles.

Each profile should run roughly 600–1200 words. They should feel like New Yorker-style writing, not Wikipedia.

---

## 11. Editorial Voice Guidelines

- **Atlas Obscura, not Wikipedia.** Long prose, photos, harvest stories, lineage trees. Not bulleted infoboxes.
- **Specific over general.** "Diego Bermudez uses bioreactors" is fine; "Diego's bioreactors monitor temperature, pH, sugar concentration, and microbial load in real time, then he applies a 40°C-to-12°C thermal shock to lock in volatile aromatics" is the version that earns the reader's trust.
- **Honor the human, not the brand.** A producer's story matters more than the marketing. The fact that Jairo's sons saw Australian café prices and had a lightbulb moment is more interesting than any tasting note.
- **Don't sand down conflict.** Diego Bermudez has been controversial (Hachi Coffee Project disqualification at Best of Panama for alleged DNA alterations). Don't hide it. The community values transparency.
- **No marketing language.** Avoid "exceptional," "unique," "world-class." Adjectives should describe specific things, not signal status.
- **Cite when relevant.** If a fact comes from a specific source (e.g. a roaster's transparency report, a Sprudge interview), link it. Don't invent details.

---

## 12. Open Questions / Future Decisions

These don't need to be solved before starting v0 but should be in the back of your mind:

- **Image sourcing.** Producer photos are mostly held by importers and roasters. Either (a) ask for permission, (b) commission/scrape carefully, or (c) lean on text + maps + commissioned illustration for v0. Probably (c) for v0, then negotiate (a) for v1.
- **Roaster scraper architecture.** For v1: scheduled Cloudflare Workers? GitHub Actions cron? Persistent queue? Scope: ~10 roasters initially, daily polling, parsing product pages to extract producer/lot/variety/process. Build site-specific parsers per roaster.
- **Quality threshold for "specialty" cafes.** Define operationally: cafe is in `cafe_roasters` with ≥1 roaster in a curated specialty whitelist. The whitelist is the editorial judgment. Start with: Sey, Hydrangea, Black & White, Onyx, La Cabra, April, Tim Wendelboe, Manhattan Coffee Roasters, Variety, Devoción, plus a few others.
- **Importer partnerships.** Reach out to Cofinet, Trabocca, Osito, Falcon, Red Fox once the site has visible content. They likely want their producers showcased and may share data. This is the non-obvious unlock for scaling beyond Colombia.
- **User-generated content.** When/if to add reviews, tasting notes, "I drank this here" check-ins. Probably not v1 — adds moderation overhead. Maybe a lightweight "I want to track this producer" follow without public content first.
- **Discovery / SEO.** The site lives or dies on whether someone searching "Diego Bermudez coffee" finds us. SSR + clean URL structure + markdown-derived semantic HTML is the foundation. Consider sitemaps and structured data (Schema.org Place / FoodEstablishment for cafes, Person for producers).
- **Mobile app.** Probably never. The web experience is enough; coffee discovery is bursty, not commute-y.

---

## 13. Useful References

### Primary sources to mine for content

- Sey Coffee: https://www.seycoffee.com/collections/coffee
- Hydrangea Coffee: https://hydrangea.coffee/
- Black & White Coffee: https://www.blackwhiteroasters.com/
- Cofinet (Arcila family): https://www.cofinet.com.au/
- The Coffee Quest (Diego Bermudez importer): https://www.thecoffeequest.com/
- Trabocca (Tesfaye Bekele/Suke Quto importer): https://www.trabocca.com/
- Hacienda La Esmeralda: https://haciendaesmeralda.com/
- The Bean Geek (existing reference site, weak editorial): https://www.thebeangeek.com/
- Sprudge (coffee media): https://sprudge.com/

### Existing competitors to be aware of

- **Siip Coffee** (siip.coffee) — bag scanning + recommendations. Different product; not direct competition but adjacent.
- **Beanhunter** — cafe finder, dated, decaying outside Australia.
- **World Map of Coffee** (worldmapofcoffee.com) — community-curated cafe map, messy.
- **European Coffee Trip** — editorial guide, not a database.
- **Open Supply Hub** — B2B sustainability mapping, not enthusiast-facing.
- **SCA Coffee Systems Map** — conceptual, not a database.

### Reference codebases (architecture inspiration)

- Rauchg's blog / vercel.com — Next.js + MDX done well.
- Atlas Obscura — editorial + map UI patterns.
- Wine Folly — taxonomy depth for a beverage category.

---

## 14. Getting Started Checklist for Claude Code

Recommended first commits, in order:

1. **Init Next.js 15 + TypeScript + Tailwind project**, deploy stub to Cloudflare Pages on the `figtre.es` domain (or new domain TBD).
2. **Set up Neon Postgres** with PostGIS extension. Get connection string into env.
3. **Write Drizzle ORM schema** (recommended for type safety with Postgres) matching Section 5. Run initial migration.
4. **Set up MDX pipeline** with `next-mdx-remote` or `contentlayer` for reading `content/**/*.mdx` and validating frontmatter against Zod schemas.
5. **Write build-time sync script** that walks MDX files, validates frontmatter, upserts into Postgres, serializes MDX bodies into the `*_md` columns.
6. **Seed countries + regions + sub-regions** via MDX files for Colombia (single country, ~5 regions, ~8 sub-regions). Verify the sync works.
7. **Write 3 producer MDX files** to validate the editorial pattern (Diego Bermudez, Wilton Benitez, Jairo Arcila — these are the most fleshed-out from research).
8. **Build the producer page template** at `/producers/[slug]` rendering MDX with custom components (`<ProducerHero>`, `<EstateMap>`, etc.).
9. **Set up MapLibre GL** with a Protomaps basemap. Build the `/atlas` page restricted to coffee-belt viewport with simple producer pins (no clustering yet — premature optimization for 30 pins).
10. **Iterate to a publishable v0**: landing page, ~30 producer profiles, working atlas, no cafes/lots/roasters yet.

Once v0 is shippable, move on to v0.5 (NYC cafes).

---

## 15. About the Operator

User context for Claude Code:
- Strong technical background (RL/ML research, ex-quant at SIG). Comfortable with deep codebases. Building this as a personal project.
- Already familiar with: Cloudflare Pages + GitHub deploy workflow (figtre.es is a stub site already deployed via this stack).
- Mac-based development setup. NYC-based.
- Prefers clean, well-architected systems over hacked-together. Wants to think big architecturally even while populating narrowly.
- Genuine specialty coffee enthusiast (familiar with Sey, Hydrangea, Black & White, CoRo, etc.).

Don't over-explain basic concepts. Do err on the side of asking before making major architectural decisions not covered by this spec.

---

*End of spec. Pin this in the repo as `SPEC.md` or similar; reference it from `README.md`.*
