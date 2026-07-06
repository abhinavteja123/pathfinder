import { SqliteRepository } from './sqlite-repository';
import type { PathfinderRepository } from './repository';

let instance: PathfinderRepository | null = null;

/** Module-level singleton so API route handlers share state within the dev
 * server process. SQLite-backed (durable across `next dev` restarts/hot-
 * reloads, and immune to the module-singleton staleness FileRepository had --
 * every query hits the same on-disk database file directly) -- was
 * InMemoryRepository (still used directly by scripts/smoke-test.ts, which
 * wants a clean slate per run, not disk state). Swap this construction for a
 * Postgres/Supabase-backed one (schema.sql already drafted) at hosting-scale
 * integration time -- callers are unaffected either way. */
export function getRepository(): PathfinderRepository {
  if (!instance) instance = new SqliteRepository();
  return instance;
}
