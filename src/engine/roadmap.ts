import type { Program, Year } from './types';

/**
 * Scripted, deterministic roadmap generation -- NO LLM calls. The app's free-tier
 * LLM budget is the real capacity ceiling (see PATHFINDER_SYSTEM_DESIGN.md §5),
 * so the roadmap is templated: stage milestones + a per-program catalog of real
 * opportunities (hackathons / internships / OSS). The current stage weaves in the
 * student's captured goal so it doesn't read generic.
 */
export interface RoadmapItemSpec {
  itemId: string;
  category: 'milestone' | 'hackathon' | 'internship' | 'oss';
  title: string;
  description: string;
  link?: string;
  order: number;
}

interface Catalog {
  hackathons: { itemId: string; title: string; description: string; link: string }[];
  internships: { itemId: string; title: string; description: string; link: string }[];
  oss: { itemId: string; title: string; description: string; link: string };
}

const CATALOGS: Record<Program, Catalog> = {
  BTech: {
    hackathons: [
      { itemId: 'hack-mlh', title: 'MLH Hackathons', description: 'Weekend hackathons worldwide — a great first win.', link: 'https://mlh.io/seasons' },
      { itemId: 'hack-devfolio', title: 'Devfolio Hackathons', description: "Browse and apply to India's biggest hackathons.", link: 'https://devfolio.co/hackathons' },
    ],
    internships: [
      { itemId: 'intern-internshala', title: 'Internshala', description: 'Apply to tech internships that match your year.', link: 'https://internshala.com' },
      { itemId: 'intern-linkedin', title: 'LinkedIn Jobs', description: 'Set alerts for early-career and intern roles.', link: 'https://www.linkedin.com/jobs' },
    ],
    oss: { itemId: 'oss-gfi', title: 'Good First Issue', description: 'Make your first open-source contribution today.', link: 'https://goodfirstissue.dev' },
  },
  BBA: {
    hackathons: [
      { itemId: 'hack-unstop', title: 'Unstop Case Comps', description: 'Live case competitions with real prizes.', link: 'https://unstop.com/competitions' },
      { itemId: 'hack-hult', title: 'Hult Prize', description: 'The global social-enterprise challenge.', link: 'https://www.hultprizeat.com' },
    ],
    internships: [
      { itemId: 'intern-internshala', title: 'Internshala', description: 'Apply to business and consulting internships.', link: 'https://internshala.com' },
      { itemId: 'intern-linkedin', title: 'LinkedIn Jobs', description: 'Set alerts for early-career business roles.', link: 'https://www.linkedin.com/jobs' },
    ],
    oss: { itemId: 'oss-project', title: 'Live Client / Portfolio Project', description: 'Ship a real project — consulting, AIESEC, or a startup gig.', link: 'https://unstop.com' },
  },
};

const STAGES: { year: Year; itemId: string; name: string; base: string }[] = [
  { year: 1, itemId: 'milestone-discover', name: 'Discover', base: 'Figure out what actually excites you.' },
  { year: 2, itemId: 'milestone-build', name: 'Build', base: 'Stack real skills and ship your first projects.' },
  { year: 3, itemId: 'milestone-convert', name: 'Convert', base: 'Turn effort into internships and PPO offers.' },
  { year: 4, itemId: 'milestone-launch', name: 'Launch', base: 'Land the offer and cross the line.' },
];

export function generateRoadmap(input: {
  year: Year;
  program: Program;
  answers: Record<string, string>;
}): RoadmapItemSpec[] {
  const { year, program, answers } = input;
  const goal = answers.goal?.trim();

  const milestones: RoadmapItemSpec[] = STAGES.map((s) => ({
    itemId: s.itemId,
    category: 'milestone' as const,
    title: s.name,
    description:
      s.year === year && goal
        ? `You're here now — building toward ${goal}.`
        : s.year === year
          ? `You're here now. ${s.base}`
          : s.base,
    order: s.year - 1,
  }));

  // Y3/Y4 are conversion/placement-focused; nudge the internship copy accordingly.
  const senior = year >= 3;
  const cat = CATALOGS[program];
  const opportunities: RoadmapItemSpec[] = [
    ...cat.hackathons,
    ...cat.internships.map((i) =>
      i.itemId === 'intern-internshala' && senior
        ? { ...i, description: 'Target PPO-track internships — conversion matters now.' }
        : i
    ),
    cat.oss,
  ].map((o, i) => ({
    itemId: o.itemId,
    category: (o.itemId.startsWith('hack')
      ? 'hackathon'
      : o.itemId.startsWith('intern')
        ? 'internship'
        : 'oss') as RoadmapItemSpec['category'],
    title: o.title,
    description: o.description,
    link: o.link,
    order: STAGES.length + i,
  }));

  return [...milestones, ...opportunities];
}
