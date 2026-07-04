import { InMemoryRepository } from './in-memory-repository';
import type { PathfinderRepository } from './repository';

let instance: PathfinderRepository | null = null;

/** Module-level singleton so API route handlers share state within the dev
 * server process. Swap the InMemoryRepository construction for a Postgres/
 * Supabase-backed one at integration time -- callers are unaffected. */
export function getRepository(): PathfinderRepository {
  if (!instance) instance = new InMemoryRepository();
  return instance;
}
