import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { MdxBody } from "@/lib/mdx";

export default async function SubRegionPage({
  params,
}: {
  params: Promise<{ country: string; region: string; subRegion: string }>;
}) {
  const { country: countrySlug, region: regionSlug, subRegion: subRegionSlug } = await params;
  const db = await getDb();

  const [subRegion] = await db
    .select()
    .from(schema.subRegions)
    .where(eq(schema.subRegions.slug, subRegionSlug))
    .limit(1);
  if (!subRegion || subRegion.regionSlug !== regionSlug) notFound();

  const [region] = await db
    .select({ name: schema.regions.name, countrySlug: schema.regions.countrySlug })
    .from(schema.regions)
    .where(eq(schema.regions.slug, regionSlug))
    .limit(1);
  if (!region || region.countrySlug !== countrySlug) notFound();

  const [country] = await db
    .select({ name: schema.countries.name })
    .from(schema.countries)
    .where(eq(schema.countries.slug, countrySlug))
    .limit(1);

  const estates = await db
    .select({
      slug: schema.estates.slug,
      name: schema.estates.name,
      type: schema.estates.type,
      primaryProducerSlug: schema.estates.primaryProducerSlug,
      primaryProducerName: schema.producers.primaryName,
    })
    .from(schema.estates)
    .leftJoin(
      schema.producers,
      eq(schema.estates.primaryProducerSlug, schema.producers.slug),
    )
    .where(eq(schema.estates.subRegionSlug, subRegionSlug))
    .orderBy(asc(schema.estates.name));

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
        <span className="mx-2">/</span>
        <Link
          href={`/${countrySlug}/${regionSlug}`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {region.name}
        </Link>
      </nav>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">{subRegion.name}</h1>

      {subRegion.descriptionMd && (
        <MdxBody source={subRegion.descriptionMd} className="mt-6" />
      )}

      {estates.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Estates here
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {estates.map((e) => (
              <li key={e.slug} className="py-3">
                <span className="font-medium">{e.name}</span>
                {e.type !== "farm" && (
                  <span className="ml-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {e.type.replace("_", " ")}
                  </span>
                )}
                {e.primaryProducerSlug && e.primaryProducerName && (
                  <span className="ml-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <Link
                      href={`/producers/${e.primaryProducerSlug}`}
                      className="hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {e.primaryProducerName}
                    </Link>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
