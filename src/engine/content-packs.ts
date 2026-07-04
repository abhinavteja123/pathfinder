import type { Program } from './types';

/**
 * Program is a content flavor over the same year-driven FSM, not a separate flow.
 */
export interface ContentPack {
  activityNoun: string;
  higherStudies: string;
}

export const CONTENT_PACKS: Record<Program, ContentPack> = {
  BTech: {
    activityNoun: 'hackathons and open-source projects',
    higherStudies: 'GATE or GRE',
  },
  BBA: {
    activityNoun: 'case competitions and consulting gigs',
    higherStudies: 'CAT or GMAT',
  },
};
