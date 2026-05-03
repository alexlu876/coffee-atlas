import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  serial,
  geometry,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

// Spec calls for `geography(Point, 4326)`. Using Drizzle's built-in
// `geometry({type:'point'})` for v0 — SRID is unset, but PostGIS spatial
// operators still work (ST_Within, etc.). Migrate to `geography(Point,4326)`
// via ALTER COLUMN when sphere-correct global distance becomes load-bearing.
const geographyPoint = (name: string) =>
  geometry(name, { type: "point" });

// ─── Geography ─────────────────────────────────────────────────────────────

export const countries = pgTable("countries", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  isoCode: text("iso_code").unique(),
  descriptionMd: text("description_md"),
  coffeeHistoryMd: text("coffee_history_md"),
  totalProductionBags: integer("total_production_bags"),
  heroImageUrl: text("hero_image_url"),
  centroid: geographyPoint("centroid"),
});

export const regions = pgTable(
  "regions",
  {
    slug: text("slug").primaryKey(),
    countrySlug: text("country_slug").references(() => countries.slug),
    name: text("name").notNull(),
    centroid: geographyPoint("centroid"),
    // v0: WKT text. ALTER COLUMN to geometry(polygon,4326) when region shading on atlas ships.
    geoPolygon: text("geo_polygon"),
    altitudeMin: integer("altitude_min"),
    altitudeMax: integer("altitude_max"),
    typicalProcesses: text("typical_processes").array(),
    typicalVarieties: text("typical_varieties").array(),
    descriptionMd: text("description_md"),
  },
  (t) => [unique().on(t.countrySlug, t.slug)],
);

export const subRegions = pgTable(
  "sub_regions",
  {
    slug: text("slug").primaryKey(),
    regionSlug: text("region_slug").references(() => regions.slug),
    name: text("name").notNull(),
    centroid: geographyPoint("centroid"),
    descriptionMd: text("description_md"),
  },
  (t) => [unique().on(t.regionSlug, t.slug)],
);

// ─── People & places ───────────────────────────────────────────────────────

export const producers = pgTable("producers", {
  slug: text("slug").primaryKey(),
  primaryName: text("primary_name").notNull(),
  altNames: text("alt_names").array(),
  bioMd: text("bio_md"),
  generation: integer("generation"),
  yearStarted: integer("year_started"),
  heroImageUrl: text("hero_image_url"),
  isCollective: boolean("is_collective").default(false),
  familyMemberSlugs: text("family_member_slugs").array(),
});

export const estates = pgTable("estates", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'farm' | 'washing_station' | 'mill'
  primaryProducerSlug: text("primary_producer_slug").references(() => producers.slug),
  subRegionSlug: text("sub_region_slug").references(() => subRegions.slug),
  location: geographyPoint("location"),
  altitudeMin: integer("altitude_min"),
  altitudeMax: integer("altitude_max"),
  areaHectares: numeric("area_hectares"),
  yearFounded: integer("year_founded"),
  descriptionMd: text("description_md"),
  notableLotsMd: text("notable_lots_md"),
  heroImageUrl: text("hero_image_url"),
});

// ─── Coffee taxonomy ───────────────────────────────────────────────────────

export const varieties = pgTable("varieties", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  altNames: text("alt_names").array(),
  parentVarietySlug: text("parent_variety_slug").references((): any => varieties.slug),
  originCountrySlug: text("origin_country_slug").references(() => countries.slug),
  originStoryMd: text("origin_story_md"),
  flavorProfileMd: text("flavor_profile_md"),
});

export const processes = pgTable("processes", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  altNames: text("alt_names").array(),
  parentProcessSlug: text("parent_process_slug").references((): any => processes.slug),
  descriptionMd: text("description_md"),
  pioneeredByProducerSlug: text("pioneered_by_producer_slug").references(() => producers.slug),
});

// ─── Lots — temporal entity ────────────────────────────────────────────────

export const lots = pgTable("lots", {
  slug: text("slug").primaryKey(),
  estateSlug: text("estate_slug").references(() => estates.slug),
  producerSlug: text("producer_slug").references(() => producers.slug),
  varietySlug: text("variety_slug").references(() => varieties.slug),
  processSlug: text("process_slug").references(() => processes.slug),
  harvestYear: integer("harvest_year").notNull(),
  name: text("name"),
  scaScore: numeric("sca_score", { precision: 4, scale: 2 }),
  tastingNotes: text("tasting_notes").array(),
  altitudePicked: integer("altitude_picked"),
  lotSizeKg: integer("lot_size_kg"),
  descriptionMd: text("description_md"),
});

// ─── Supply chain entities ─────────────────────────────────────────────────

export const importers = pgTable("importers", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  hqCountrySlug: text("hq_country_slug").references(() => countries.slug),
  website: text("website"),
  descriptionMd: text("description_md"),
});

export const cities = pgTable("cities", {
  slug: text("slug").primaryKey(),
  countrySlug: text("country_slug").references(() => countries.slug),
  name: text("name").notNull(),
  centroid: geographyPoint("centroid"),
});

export const neighborhoods = pgTable(
  "neighborhoods",
  {
    slug: text("slug").primaryKey(),
    citySlug: text("city_slug").references(() => cities.slug),
    name: text("name").notNull(),
    centroid: geographyPoint("centroid"),
  },
  (t) => [unique().on(t.citySlug, t.slug)],
);

export const roasters = pgTable("roasters", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  hqCitySlug: text("hq_city_slug").references(() => cities.slug),
  website: text("website"),
  philosophyMd: text("philosophy_md"),
  foundedYear: integer("founded_year"),
  descriptionMd: text("description_md"),
  heroImageUrl: text("hero_image_url"),
});

export const cafes = pgTable("cafes", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  neighborhoodSlug: text("neighborhood_slug").references(() => neighborhoods.slug),
  address: text("address"),
  location: geographyPoint("location"),
  hoursJson: jsonb("hours_json"),
  descriptionMd: text("description_md"),
  ambianceNotes: text("ambiance_notes"),
  photoUrls: text("photo_urls").array(),
});

// ─── Supply graph (joins) ──────────────────────────────────────────────────

export const producerImporters = pgTable(
  "producer_importers",
  {
    producerSlug: text("producer_slug").notNull().references(() => producers.slug),
    importerSlug: text("importer_slug").notNull().references(() => importers.slug),
    sinceYear: integer("since_year"),
    isPrimary: boolean("is_primary"),
  },
  (t) => [primaryKey({ columns: [t.producerSlug, t.importerSlug] })],
);

export const roasterLots = pgTable(
  "roaster_lots",
  {
    roasterSlug: text("roaster_slug").notNull().references(() => roasters.slug),
    lotSlug: text("lot_slug").notNull().references(() => lots.slug),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    status: text("status"), // 'active' | 'sold_out' | 'historical'
    productUrl: text("product_url"),
    retailPriceUsd: numeric("retail_price_usd"),
  },
  (t) => [primaryKey({ columns: [t.roasterSlug, t.lotSlug] })],
);

export const cafeRoasters = pgTable(
  "cafe_roasters",
  {
    cafeSlug: text("cafe_slug").notNull().references(() => cafes.slug),
    roasterSlug: text("roaster_slug").notNull().references(() => roasters.slug),
    isPrimary: boolean("is_primary"),
    notesMd: text("notes_md"),
  },
  (t) => [primaryKey({ columns: [t.cafeSlug, t.roasterSlug] })],
);

export const cafeLots = pgTable(
  "cafe_lots",
  {
    cafeSlug: text("cafe_slug").notNull().references(() => cafes.slug),
    lotSlug: text("lot_slug").notNull().references(() => lots.slug),
    format: text("format"), // 'filter' | 'espresso' | 'both'
    status: text("status"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.cafeSlug, t.lotSlug] })],
);

// ─── Competitions ──────────────────────────────────────────────────────────

export const competitions = pgTable("competitions", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  countrySlug: text("country_slug").references(() => countries.slug),
  year: integer("year").notNull(),
  type: text("type"),
});

// Spec PK was (competition_slug, producer_slug, lot_slug) but lot_slug is
// nullable, which Postgres disallows in a primary key. Using a synthetic id
// preserves the relational shape; uniqueness constraints can be added later
// once the entry semantics are nailed down.
export const competitionResults = pgTable("competition_results", {
  id: serial("id").primaryKey(),
  competitionSlug: text("competition_slug").notNull().references(() => competitions.slug),
  producerSlug: text("producer_slug").notNull().references(() => producers.slug),
  lotSlug: text("lot_slug").references(() => lots.slug),
  rank: integer("rank"),
  score: numeric("score", { precision: 4, scale: 2 }),
  lotNameAtCompetition: text("lot_name_at_competition"),
});
