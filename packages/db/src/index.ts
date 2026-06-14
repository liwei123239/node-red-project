import { env } from "@node-red-project/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const createPool = () => {
  const databaseUrl = new URL(env.DATABASE_URL);
  const sslEnabled =
    databaseUrl.searchParams.get("sslmode") === "require" || databaseUrl.hostname.endsWith(".rds.amazonaws.com");

  return new Pool({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || "5432"),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace(/^\//, ""),
    ssl: sslEnabled
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });
};

export function createDb() {
  return drizzle(createPool(), { schema });
}

export const db = createDb();
