import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { MdxBody } from "@/lib/mdx";

export const revalidate = 3600;

export default async function ProducerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const [producer] = await db
    .select()
    .from(schema.producers)
    .where(eq(schema.producers.slug, slug))
    .limit(1);
  if (!producer) notFound();

  const estates = await db
    .select({
      slug: schema.estates.slug,
      name: schema.estates.name,
      type: schema.estates.type,
      subRegionSlug: schema.estates.subRegionSlug,
      subRegionName: schema.subRegions.name,
      regionSlug: schema.regions.slug,
      regionName: schema.regions.name,
      countrySlug: schema.regions.countrySlug,
    })
    .from(schema.estates)
    .leftJoin(
      schema.subRegions,
      eq(schema.estates.subRegionSlug, schema.subRegions.slug),
    )
    .leftJoin(
      schema.regions,
      eq(schema.subRegions.regionSlug, schema.regions.slug),
    )
    .where(eq(schema.estates.primaryProducerSlug, slug))
    .orderBy(asc(schema.estates.name));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Coffee Atlas
        </Link>
        <span className="mx-2">/</span>
        <Link href="/producers" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Producers
        </Link>
      </nav>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">{producer.primaryName}</h1>

      {producer.altNames && producer.altNames.length > 0 && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          also known as {producer.altNames.join(", ")}
        </p>
      )}

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {producer.yearStarted && <span>started {producer.yearStarted}</span>}
        {producer.generation && <span>generation {producer.generation}</span>}
      </dl>

      {producer.bioMd && <MdxBody source={producer.bioMd} className="mt-6" />}

      {estates.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Estates
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
                {e.subRegionName && e.regionSlug && e.countrySlug && (
                  <span className="ml-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <Link
                      href={`/${e.countrySlug}/${e.regionSlug}/${e.subRegionSlug}`}
                      className="hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {e.subRegionName}
                    </Link>
                    {", "}
                    <Link
                      href={`/${e.countrySlug}/${e.regionSlug}`}
                      className="hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {e.regionName}
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
