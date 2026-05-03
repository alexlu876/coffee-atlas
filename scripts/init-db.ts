import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".dev.vars" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .dev.vars");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
  const [{ v }] = await sql`SELECT PostGIS_Full_Version() AS v`;
  console.log("postgis enabled:", v);
}

main().catch((err) => {
  console.error("error:", err.message);
  process.exit(1);
});
