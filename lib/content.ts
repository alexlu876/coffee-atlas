import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

// ─── Frontmatter schemas ───────────────────────────────────────────────────
// Coordinates are [lng, lat] tuples (matching PostGIS POINT(lng lat) order).

const Coord = z.tuple([z.number(), z.number()]);

export const CountryFrontmatter = z.object({
  slug: z.string(),
  name: z.string(),
  iso_code: z.string().length(2).optional(),
  total_production_bags: z.number().int().optional(),
  hero_image_url: z.string().optional(),
  centroid: Coord.optional(),
});

export const RegionFrontmatter = z.object({
  slug: z.string(),
  country_slug: z.string(),
  name: z.string(),
  centroid: Coord.optional(),
  altitude_min: z.number().int().optional(),
  altitude_max: z.number().int().optional(),
  typical_processes: z.array(z.string()).optional(),
  typical_varieties: z.array(z.string()).optional(),
});

export const SubRegionFrontmatter = z.object({
  slug: z.string(),
  region_slug: z.string(),
  name: z.string(),
  centroid: Coord.optional(),
});

export const ProducerFrontmatter = z.object({
  slug: z.string(),
  primary_name: z.string(),
  alt_names: z.array(z.string()).optional(),
  generation: z.number().int().optional(),
  year_started: z.number().int().optional(),
  is_collective: z.boolean().default(false),
  hero_image_url: z.string().optional(),
  family_member_slugs: z.array(z.string()).optional(),
  // relationship hints — resolved in a second pass after all entities are inserted
  estates: z.array(z.string()).optional(),
  pioneered_processes: z.array(z.string()).optional(),
});

export const EstateFrontmatter = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.enum(["farm", "washing_station", "mill"]),
  primary_producer_slug: z.string().optional(),
  sub_region_slug: z.string().optional(),
  location: Coord.optional(),
  altitude_min: z.number().int().optional(),
  altitude_max: z.number().int().optional(),
  area_hectares: z.number().optional(),
  year_founded: z.number().int().optional(),
  hero_image_url: z.string().optional(),
});

// ─── Loader ────────────────────────────────────────────────────────────────

export type ContentEntry<T> = { slug: string; data: T; body: string; sourcePath: string };

export type LoadedContent = {
  countries: ContentEntry<z.infer<typeof CountryFrontmatter>>[];
  regions: ContentEntry<z.infer<typeof RegionFrontmatter>>[];
  subRegions: ContentEntry<z.infer<typeof SubRegionFrontmatter>>[];
  producers: ContentEntry<z.infer<typeof ProducerFrontmatter>>[];
  estates: ContentEntry<z.infer<typeof EstateFrontmatter>>[];
};

const DIR_TO_SCHEMA = {
  countries: CountryFrontmatter,
  regions: RegionFrontmatter,
  "sub-regions": SubRegionFrontmatter,
  producers: ProducerFrontmatter,
  estates: EstateFrontmatter,
} as const;

async function readMdxDir<T>(
  rootDir: string,
  subdir: string,
  schema: z.ZodType<T>,
): Promise<ContentEntry<T>[]> {
  const dir = path.join(rootDir, subdir);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const out: ContentEntry<T>[] = [];
  for (const file of entries) {
    if (!file.endsWith(".mdx")) continue;
    const sourcePath = path.join(dir, file);
    const raw = await fs.readFile(sourcePath, "utf8");
    const parsed = matter(raw);
    const result = schema.safeParse(parsed.data);
    if (!result.success) {
      throw new Error(
        `frontmatter validation failed for ${sourcePath}:\n${z.prettifyError(result.error)}`,
      );
    }
    const data = result.data as T & { slug: string };
    if (data.slug !== path.basename(file, ".mdx")) {
      throw new Error(
        `slug mismatch in ${sourcePath}: frontmatter says "${data.slug}", filename says "${path.basename(file, ".mdx")}"`,
      );
    }
    out.push({ slug: data.slug, data, body: parsed.content.trim(), sourcePath });
  }
  return out;
}

export async function loadAllContent(rootDir = "./content"): Promise<LoadedContent> {
  const [countries, regions, subRegions, producers, estates] = await Promise.all([
    readMdxDir(rootDir, "countries", DIR_TO_SCHEMA.countries),
    readMdxDir(rootDir, "regions", DIR_TO_SCHEMA.regions),
    readMdxDir(rootDir, "sub-regions", DIR_TO_SCHEMA["sub-regions"]),
    readMdxDir(rootDir, "producers", DIR_TO_SCHEMA.producers),
    readMdxDir(rootDir, "estates", DIR_TO_SCHEMA.estates),
  ]);
  return { countries, regions, subRegions, producers, estates };
}
