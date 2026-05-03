import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { MdxBody } from "@/lib/mdx";

export const revalidate = 3600;

export default async function RegionPage({
  params,
}: {
  params: Promise<{ country: string; region: string }>;
}) {
  const { country: countrySlug, region: regionSlug } = await params;
  const db = await getDb();

  const [region] = await db
    .select()
    .from(schema.regions)
    .where(eq(schema.regions.slug, regionSlug))
    .limit(1);
  if (!region || region.countrySlug !== countrySlug) notFound();

  const [country] = await db
    .select({ name: schema.countries.name })
    .from(schema.countries)
    .where(eq(schema.countries.slug, countrySlug))
    .limit(1);

  const subRegions = await db
    .select()
    .from(schema.subRegions)
    .where(eq(schema.subRegions.regionSlug, regionSlug))
    .orderBy(asc(schema.subRegions.name));

  const producersInRegion = await db
    .selectDistinct({
      slug: schema.producers.slug,
      primaryName: schema.producers.primaryName,
    })
    .from(schema.producers)
    .innerJoin(
      schema.estates,
      eq(schema.estates.primaryProducerSlug, schema.producers.slug),
    )
    .innerJoin(
      schema.subRegions,
      eq(schema.estates.subRegionSlug, schema.subRegions.slug),
    )
    .where(eq(schema.subRegions.regionSlug, regionSlug))
    .orderBy(asc(schema.producers.primaryName));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Coffee Atlas
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/${countrySlug}`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {country?.name ?? countrySlug}
        </Link>
      </nav>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">{region.name}</h1>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {(region.altitudeMin != null || region.altitudeMax != null) && (
          <span>
            {region.altitudeMin}–{region.altitudeMax} m
          </span>
        )}
        {region.typicalProcesses && region.typicalProcesses.length > 0 && (
          <span>processes: {region.typicalProcesses.join(", ")}</span>
        )}
        {region.typicalVarieties && region.typicalVarieties.length > 0 && (
          <span>varieties: {region.typicalVarieties.join(", ")}</span>
        )}
      </dl>

      {region.descriptionMd && (
        <MdxBody source={region.descriptionMd} className="mt-6" />
      )}

      {subRegions.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Sub-regions
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {subRegions.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${countrySlug}/${regionSlug}/${s.slug}`}
                  className="block py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="font-medium">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {producersInRegion.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Producers
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {producersInRegion.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/producers/${p.slug}`}
                  className="block py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="font-medium">{p.primaryName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
