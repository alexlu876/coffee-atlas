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

  // ── Insert in dependency order. Upserts so the script is idempotent. ──

  for (const c of content.countries) {
    await sql`
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
    `;
  }

  for (const r of content.regions) {
    await sql`
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
    `;
  }

  for (const s of content.subRegions) {
    await sql`
      INSERT INTO sub_regions (slug, region_slug, name, centroid, description_md)
      VALUES (${s.data.slug}, ${s.data.region_slug}, ${s.data.name},
              ${pointWkt(s.data.centroid)}, ${s.body || null})
      ON CONFLICT (slug) DO UPDATE SET
        region_slug = EXCLUDED.region_slug,
        name = EXCLUDED.name,
        centroid = EXCLUDED.centroid,
        description_md = EXCLUDED.description_md
    `;
  }

  for (const p of content.producers) {
    await sql`
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
    `;
  }

  for (const e of content.estates) {
    await sql`
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
    `;
  }

  // ── Second pass: resolve relationship hints from producer frontmatter ──

  for (const p of content.producers) {
    if (p.data.estates) {
      for (const estateSlug of p.data.estates) {
        await sql`
          UPDATE estates SET primary_producer_slug = ${p.data.slug}
          WHERE slug = ${estateSlug} AND primary_producer_slug IS DISTINCT FROM ${p.data.slug}
        `;
      }
    }
    if (p.data.pioneered_processes) {
      for (const procSlug of p.data.pioneered_processes) {
        await sql`
          UPDATE processes SET pioneered_by_producer_slug = ${p.data.slug}
          WHERE slug = ${procSlug} AND pioneered_by_producer_slug IS DISTINCT FROM ${p.data.slug}
        `;
      }
    }
  }

  console.log("sync complete");
}

main().catch((err) => {
  console.error("sync error:", err.message);
  process.exit(1);
});
