import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { MdxBody } from "@/lib/mdx";

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
    </main>
  );
}
