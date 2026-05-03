import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProducersIndex() {
  const db = await getDb();
  const producers = await db
    .select()
    .from(schema.producers)
    .orderBy(asc(schema.producers.primaryName));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Coffee Atlas
        </Link>
      </nav>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">Producers</h1>

      {producers.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No producers yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
          {producers.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/producers/${p.slug}`}
                className="block py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span className="font-medium">{p.primaryName}</span>
                {p.yearStarted && (
                  <span className="ml-3 text-sm text-zinc-500 dark:text-zinc-400">
                    since {p.yearStarted}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
