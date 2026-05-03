import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(neon(env.DATABASE_URL), { schema });
}

export { schema };
