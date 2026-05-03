import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { MdxBody } from "@/lib/mdx";

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: countrySlug } = await params;
  const db = await getDb();

  const [country] = await db
    .select()
    .from(schema.countries)
    .where(eq(schema.countries.slug, countrySlug))
    .limit(1);
  if (!country) notFound();

  const regions = await db
    .select()
    .from(schema.regions)
    .where(eq(schema.regions.countrySlug, countrySlug))
    .orderBy(asc(schema.regions.name));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Coffee Atlas
      </Link>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">{country.name}</h1>

      {country.descriptionMd && (
        <MdxBody source={country.descriptionMd} className="mt-6" />
      )}

      {regions.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Regions
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {regions.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${countrySlug}/${r.slug}`}
                  className="block py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="font-medium">{r.name}</span>
                  {(r.altitudeMin || r.altitudeMax) && (
                    <span className="ml-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {r.altitudeMin}–{r.altitudeMax} m
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
