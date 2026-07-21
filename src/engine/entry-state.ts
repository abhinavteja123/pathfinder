import type { Year } from './types';

/**
 * (year, hasHistory, reengagementDue) -> entry node id. Three ways in per year:
 *  - NEW student (no history)            -> `intro`    : the 10-question intake.
 *  - RETURNING + 14-day check-in due     -> `followup` : the 5-question follow-up.
 *  - RETURNING + not yet due             -> `continue` : a brief welcome-back/resume.
 * A student can hit the gate for the first time at any year (transfer, backlog,
 * late signup), so entry branches on real history, never assumes everyone starts at Y1.
 */
const ENTRY_TABLE: Record<Year, { intro: string; followup: string; continue: string }> = {
  1: { intro: 'discover_intro', followup: 'discover_followup_intro', continue: 'discover_continue' },
  2: { intro: 'build_intro', followup: 'build_followup_intro', continue: 'build_continue' },
  3: { intro: 'convert_intro', followup: 'convert_followup_intro', continue: 'convert_continue' },
  4: { intro: 'launch_intro', followup: 'launch_followup_intro', continue: 'launch_continue' },
};

export function resolveEntryNode(year: Year, hasHistory: boolean, reengagementDue: boolean): string {
  const row = ENTRY_TABLE[year];
  if (!hasHistory) return row.intro;
  return reengagementDue ? row.followup : row.continue;
}
