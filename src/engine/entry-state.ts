import type { Year } from './types';

/**
 * (year, hasHistory) -> entry node id.
 * A student can hit the gate for the first time at any year (transfer, backlog,
 * late signup), so entry must branch on real history, not assume everyone starts at Y1.
 */
const ENTRY_TABLE: Record<Year, { withHistory: string; withoutHistory: string }> = {
  1: { withHistory: 'discover_intro', withoutHistory: 'discover_intro' },
  2: { withHistory: 'build_continue', withoutHistory: 'build_catchup_intro' },
  3: { withHistory: 'convert_continue', withoutHistory: 'convert_catchup_intro' },
  4: { withHistory: 'launch_continue', withoutHistory: 'launch_catchup_intro' },
};

export function resolveEntryNode(year: Year, hasHistory: boolean): string {
  const row = ENTRY_TABLE[year];
  return hasHistory ? row.withHistory : row.withoutHistory;
}
