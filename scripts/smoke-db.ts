import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".dev.vars" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .dev.vars");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const [{ version }] = await sql`SELECT version() AS version`;
  console.log("postgres:", version);

  const postgis = await sql`SELECT extname FROM pg_extension WHERE extname = 'postgis'`;
  if (postgis.length === 0) {
    console.log("postgis: NOT INSTALLED — run `CREATE EXTENSION postgis;` in Neon SQL Editor");
  } else {
    const [{ v }] = await sql`SELECT PostGIS_Full_Version() AS v`;
    console.log("postgis:", v);
  }

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name NOT LIKE '\\_\\_%' ESCAPE '\\'
    ORDER BY table_name`;
  console.log(`tables: ${tables.length}`);
  for (const t of tables) console.log(" ", t.table_name);
}

main().catch((err) => {
  console.error("error:", err.message);
  process.exit(1);
});
