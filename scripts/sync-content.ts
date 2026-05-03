import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { loadAllContent } from "../lib/content";

config({ path: ".dev.vars" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .dev.vars");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function pointWkt(coord: [number, number] | undefined): string | null {
  if (!coord) return null;
  return `POINT(${coord[0]} ${coord[1]})`;
}

async function main() {
  const content = await loadAllContent();
  const counts = {
    countries: content.countries.length,
    regions: content.regions.length,
    subRegions: content.subRegions.length,
    producers: content.producers.length,
    estates: content.estates.length,
  };
  console.log("loaded:", counts);

  // ── Validate slug references in producer frontmatter ──────────────────────

  const estateSlugs = new Set(content.estates.map((e) => e.slug));
  const warnings: string[] = [];

  for (const p of content.producers) {
    for (const slug of p.data.estates ?? []) {
      if (!estateSlugs.has(slug)) {
        warnings.push(
          `producer "${p.data.slug}" references estate "${slug}" which has no MDX file at content/estates/${slug}.mdx`,
        );
      }
    }
    if ((p.data.pioneered_processes ?? []).length > 0) {
      // processes table is not yet seeded; warn that the second-pass update will be a no-op
      warnings.push(
        `producer "${p.data.slug}" references pioneered_processes ${JSON.stringify(p.data.pioneered_processes)} but content/processes/ is not seeded yet — second-pass update will not apply`,
      );
    }
  }

  if (warnings.length > 0) {
    console.warn(`\n${warnings.length} warnings before sync:`);
    for (const w of warnings) console.warn(`  !`, w);
    console.warn("");
  }

  // ── Build all queries (run as single transaction for atomicity) ───────────

  const queries = [];

  for (const c of content.countries) {
    queries.push(sql`
      INSERT INTO countries (slug, name, iso_code, total_production_bags, hero_image_url, description_md, centroid)
      VALUES (${c.data.slug}, ${c.data.name}, ${c.data.iso_code ?? null},
              ${c.data.total_production_bags ?? null}, ${c.data.hero_image_url ?? null},
              ${c.body || null}, ${pointWkt(c.data.centroid)})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        iso_code = EXCLUDED.iso_code,
        total_production_bags = EXCLUDED.total_production_bags,
        hero_image_url = EXCLUDED.hero_image_url,
        description_md = EXCLUDED.description_md,
        centroid = EXCLUDED.centroid
    `);
  }

  for (const r of content.regions) {
    queries.push(sql`
      INSERT INTO regions (slug, country_slug, name, centroid, altitude_min, altitude_max,
                           typical_processes, typical_varieties, description_md)
      VALUES (${r.data.slug}, ${r.data.country_slug}, ${r.data.name},
              ${pointWkt(r.data.centroid)}, ${r.data.altitude_min ?? null}, ${r.data.altitude_max ?? null},
              ${r.data.typical_processes ?? null}, ${r.data.typical_varieties ?? null},
              ${r.body || null})
      ON CONFLICT (slug) DO UPDATE SET
        country_slug = EXCLUDED.country_slug,
        name = EXCLUDED.name,
        centroid = EXCLUDED.centroid,
        altitude_min = EXCLUDED.altitude_min,
        altitude_max = EXCLUDED.altitude_max,
        typical_processes = EXCLUDED.typical_processes,
        typical_varieties = EXCLUDED.typical_varieties,
        description_md = EXCLUDED.description_md
    `);
  }

  for (const s of content.subRegions) {
    queries.push(sql`
      INSERT INTO sub_regions (slug, region_slug, name, centroid, description_md)
      VALUES (${s.data.slug}, ${s.data.region_slug}, ${s.data.name},
              ${pointWkt(s.data.centroid)}, ${s.body || null})
      ON CONFLICT (slug) DO UPDATE SET
        region_slug = EXCLUDED.region_slug,
        name = EXCLUDED.name,
        centroid = EXCLUDED.centroid,
        description_md = EXCLUDED.description_md
    `);
  }

  for (const p of content.producers) {
    queries.push(sql`
      INSERT INTO producers (slug, primary_name, alt_names, bio_md, generation, year_started,
                             hero_image_url, is_collective, family_member_slugs)
      VALUES (${p.data.slug}, ${p.data.primary_name}, ${p.data.alt_names ?? null},
              ${p.body || null}, ${p.data.generation ?? null}, ${p.data.year_started ?? null},
              ${p.data.hero_image_url ?? null}, ${p.data.is_collective},
              ${p.data.family_member_slugs ?? null})
      ON CONFLICT (slug) DO UPDATE SET
        primary_name = EXCLUDED.primary_name,
        alt_names = EXCLUDED.alt_names,
        bio_md = EXCLUDED.bio_md,
        generation = EXCLUDED.generation,
        year_started = EXCLUDED.year_started,
        hero_image_url = EXCLUDED.hero_image_url,
        is_collective = EXCLUDED.is_collective,
        family_member_slugs = EXCLUDED.family_member_slugs
    `);
  }

  for (const e of content.estates) {
    queries.push(sql`
      INSERT INTO estates (slug, name, type, primary_producer_slug, sub_region_slug, location,
                           altitude_min, altitude_max, area_hectares, year_founded,
                           description_md, hero_image_url)
      VALUES (${e.data.slug}, ${e.data.name}, ${e.data.type},
              ${e.data.primary_producer_slug ?? null}, ${e.data.sub_region_slug ?? null},
              ${pointWkt(e.data.location)}, ${e.data.altitude_min ?? null},
              ${e.data.altitude_max ?? null}, ${e.data.area_hectares ?? null},
              ${e.data.year_founded ?? null}, ${e.body || null}, ${e.data.hero_image_url ?? null})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        primary_producer_slug = EXCLUDED.primary_producer_slug,
        sub_region_slug = EXCLUDED.sub_region_slug,
        location = EXCLUDED.location,
        altitude_min = EXCLUDED.altitude_min,
        altitude_max = EXCLUDED.altitude_max,
        area_hectares = EXCLUDED.area_hectares,
        year_founded = EXCLUDED.year_founded,
        description_md = EXCLUDED.description_md,
        hero_image_url = EXCLUDED.hero_image_url
    `);
  }

  // ── Second pass: producer→estate relationship hints ───────────────────────

  for (const p of content.producers) {
    for (const estateSlug of p.data.estates ?? []) {
      if (!estateSlugs.has(estateSlug)) continue; // already warned
      queries.push(sql`
        UPDATE estates SET primary_producer_slug = ${p.data.slug}
        WHERE slug = ${estateSlug} AND primary_producer_slug IS DISTINCT FROM ${p.data.slug}
      `);
    }
  }

  await sql.transaction(queries);

  // ── Detect orphan rows (in DB but no MDX file) ────────────────────────────

  await detectOrphans("countries", content.countries);
  await detectOrphans("regions", content.regions);
  await detectOrphans("sub_regions", content.subRegions);
  await detectOrphans("producers", content.producers);
  await detectOrphans("estates", content.estates);

  console.log("sync complete");
}

async function detectOrphans(table: string, content: { slug: string }[]): Promise<void> {
  const fileSlugs = new Set(content.map((c) => c.slug));
  const dbRows = (await sql.query(`SELECT slug FROM ${table}`)) as { slug: string }[];
  const orphans = dbRows.filter((r) => !fileSlugs.has(r.slug));
  if (orphans.length > 0) {
    console.warn(
      `! ${orphans.length} orphan row(s) in ${table} (DB rows with no MDX): ${orphans.map((o) => o.slug).join(", ")}`,
    );
    console.warn(
      `  to remove: DELETE FROM ${table} WHERE slug IN (${orphans.map((o) => `'${o.slug}'`).join(", ")});`,
    );
  }
}

main().catch((err) => {
  console.error("sync error:", err.message);
  process.exit(1);
});
