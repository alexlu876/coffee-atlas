import Link from "next/link";
import { sql, isNotNull, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import AtlasMap, { type AtlasEstate } from "@/components/atlas-map";

export const revalidate = 3600;

export default async function AtlasPage() {
  const db = await getDb();
  const rows = await db
    .select({
      slug: schema.estates.slug,
      name: schema.estates.name,
      primaryProducerSlug: schema.estates.primaryProducerSlug,
      primaryProducerName: schema.producers.primaryName,
      lng: sql<number>`ST_X(${schema.estates.location}::geometry)`,
      lat: sql<number>`ST_Y(${schema.estates.location}::geometry)`,
    })
    .from(schema.estates)
    .leftJoin(
      schema.producers,
      eq(schema.estates.primaryProducerSlug, schema.producers.slug),
    )
    .where(isNotNull(schema.estates.location));

  const estates: AtlasEstate[] = rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    primaryProducerSlug: r.primaryProducerSlug,
    primaryProducerName: r.primaryProducerName,
    lng: Number(r.lng),
    lat: Number(r.lat),
  }));

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Coffee Atlas
        </Link>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {estates.length} {estates.length === 1 ? "estate" : "estates"}
        </span>
      </header>
      <AtlasMap estates={estates} />
    </div>
  );
}
