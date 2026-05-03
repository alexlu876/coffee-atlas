import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const BASE_URL = "https://coffee.figtre.es";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();

  const [countries, regions, subRegions, producers] = await Promise.all([
    db.select({ slug: schema.countries.slug }).from(schema.countries),
    db
      .select({ slug: schema.regions.slug, countrySlug: schema.regions.countrySlug })
      .from(schema.regions),
    db
      .select({
        slug: schema.subRegions.slug,
        regionSlug: schema.subRegions.regionSlug,
        countrySlug: schema.regions.countrySlug,
      })
      .from(schema.subRegions)
      .leftJoin(schema.regions, eq(schema.subRegions.regionSlug, schema.regions.slug)),
    db.select({ slug: schema.producers.slug }).from(schema.producers),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/atlas`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/producers`, changeFrequency: "weekly", priority: 0.9 },
  ];

  const countryEntries = countries.map((c) => ({
    url: `${BASE_URL}/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const regionEntries = regions
    .filter((r) => r.countrySlug)
    .map((r) => ({
      url: `${BASE_URL}/${r.countrySlug}/${r.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const subRegionEntries = subRegions
    .filter((s) => s.regionSlug && s.countrySlug)
    .map((s) => ({
      url: `${BASE_URL}/${s.countrySlug}/${s.regionSlug}/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const producerEntries = producers.map((p) => ({
    url: `${BASE_URL}/producers/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticEntries,
    ...countryEntries,
    ...regionEntries,
    ...subRegionEntries,
    ...producerEntries,
  ];
}
