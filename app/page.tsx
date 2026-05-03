import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const countries = await db
    .select()
    .from(schema.countries)
    .orderBy(asc(schema.countries.name));

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-2xl font-medium tracking-tight">Coffee Atlas</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 max-w-xl">
        A specialty coffee atlas. Producers, roasters, cafes, and the connections between them.
      </p>

      {countries.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Countries
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {countries.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${c.slug}`}
                  className="block py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <span className="font-medium">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
