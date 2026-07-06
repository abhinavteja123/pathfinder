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

/** Domain-specific opportunity catalog -- keyed by the exact option labels
 * from `discover_domain` in nodes.ts. Scripted, not LLM-picked: the domain
 * choice is a menu answer, so lookup is a direct dictionary hit, no guessing.
 * itemId prefixed `domain-` so the UI can render this as its own "your {domain}
 * roadmap" panel, separate from the universal milestone spine. */
const DOMAIN_CATALOG: Record<string, { itemId: string; title: string; description: string; link: string }[]> = {
  'AI/ML': [
    { itemId: 'domain-kaggle', title: 'Kaggle', description: 'Real datasets and ML competitions to build a portfolio.', link: 'https://www.kaggle.com' },
    { itemId: 'domain-deeplearningai', title: 'DeepLearning.AI', description: 'Structured courses straight from the field’s best.', link: 'https://www.deeplearning.ai' },
    { itemId: 'domain-paperswithcode', title: 'Papers with Code', description: 'Latest ML research paired with working implementations.', link: 'https://paperswithcode.com' },
  ],
  Cybersecurity: [
    { itemId: 'domain-tryhackme', title: 'TryHackMe', description: 'Guided, hands-on security labs for beginners.', link: 'https://tryhackme.com' },
    { itemId: 'domain-hackthebox', title: 'Hack The Box', description: 'Real-world penetration testing challenges.', link: 'https://www.hackthebox.com' },
    { itemId: 'domain-owasp', title: 'OWASP', description: 'The standard reference for web application security.', link: 'https://owasp.org' },
  ],
  IoT: [
    { itemId: 'domain-hackster', title: 'Hackster.io', description: 'Community IoT projects you can actually build.', link: 'https://www.hackster.io' },
    { itemId: 'domain-arduino', title: 'Arduino Project Hub', description: 'Start here for your first connected-device project.', link: 'https://projecthub.arduino.cc' },
    { itemId: 'domain-raspberrypi', title: 'Raspberry Pi Projects', description: 'Official project guides for Pi-based builds.', link: 'https://projects.raspberrypi.org' },
  ],
  ECE: [
    { itemId: 'domain-ieeexplore', title: 'IEEE Xplore', description: 'Papers and student resources across electronics.', link: 'https://ieeexplore.ieee.org' },
    { itemId: 'domain-hackaday', title: 'Hackaday', description: 'Real hardware builds and circuit-design writeups.', link: 'https://hackaday.com' },
    { itemId: 'domain-allaboutcircuits', title: 'All About Circuits', description: 'Solid reference for circuit design fundamentals.', link: 'https://www.allaboutcircuits.com' },
  ],
  EEE: [
    { itemId: 'domain-nptel', title: 'NPTEL Electrical Engineering', description: 'Free university-grade electrical engineering courses.', link: 'https://nptel.ac.in' },
    { itemId: 'domain-ieeepes', title: 'IEEE Power & Energy Society', description: 'Power systems community, resources, and events.', link: 'https://www.ieee-pes.org' },
    { itemId: 'domain-electrical4u', title: 'Electrical4U', description: 'Clear explainers for core electrical concepts.', link: 'https://www.electrical4u.com' },
  ],
  'Web Dev': [
    { itemId: 'domain-freecodecamp', title: 'freeCodeCamp', description: 'Free, project-based path from basics to full-stack.', link: 'https://www.freecodecamp.org' },
    { itemId: 'domain-theodinproject', title: 'The Odin Project', description: 'A full curriculum, portfolio projects included.', link: 'https://www.theodinproject.com' },
    { itemId: 'domain-mdn', title: 'MDN Web Docs', description: 'The reference every web dev keeps open.', link: 'https://developer.mozilla.org' },
  ],
  'Cloud/DevOps': [
    { itemId: 'domain-awsskillbuilder', title: 'AWS Skill Builder', description: 'Free, official AWS training and certification prep.', link: 'https://skillbuilder.aws' },
    { itemId: 'domain-docker', title: 'Docker 101 Tutorial', description: 'Hands-on intro to containers, no local setup needed.', link: 'https://www.docker.com/101-tutorial' },
    { itemId: 'domain-kubernetes', title: 'Kubernetes Tutorials', description: 'Official, guided intro to container orchestration.', link: 'https://kubernetes.io/docs/tutorials' },
  ],
  'Mobile Dev': [
    { itemId: 'domain-flutter', title: 'Flutter Codelabs', description: 'Guided, hands-on Flutter app-building tutorials.', link: 'https://docs.flutter.dev/codelabs' },
    { itemId: 'domain-android', title: 'Android Developers', description: "Google's official Android development courses.", link: 'https://developer.android.com/courses' },
    { itemId: 'domain-reactnative', title: 'React Native Docs', description: 'Build cross-platform apps if you already know React.', link: 'https://reactnative.dev' },
  ],
  Blockchain: [
    { itemId: 'domain-cryptozombies', title: 'CryptoZombies', description: 'Learn Solidity by building a zombie game, step by step.', link: 'https://cryptozombies.io' },
    { itemId: 'domain-ethereumdevs', title: 'Ethereum.org for Developers', description: 'Official docs and tutorials for building on Ethereum.', link: 'https://ethereum.org/en/developers' },
    { itemId: 'domain-alchemyuniversity', title: 'Alchemy University', description: 'Free, structured Web3 developer bootcamp.', link: 'https://university.alchemy.com' },
  ],
  'Data Science': [
    { itemId: 'domain-datacamp', title: 'DataCamp', description: 'Interactive courses across the whole data science stack.', link: 'https://www.datacamp.com' },
    { itemId: 'domain-uciml', title: 'UCI ML Repository', description: 'Classic real datasets to practice analysis on.', link: 'https://archive.ics.uci.edu' },
    { itemId: 'domain-kaggle-ds', title: 'Kaggle Datasets', description: 'Real-world datasets and notebooks to learn from.', link: 'https://www.kaggle.com/datasets' },
  ],
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
        // Base sentence always stays grammatically whole -- goal is raw
        // free-text from an LLM node ("what game's got you hooked?" etc, not
        // a real goal statement), so it can't be trusted as a sentence's
        // object. Quoting it as an aside reads fine no matter how short or
        // fragment-like the captured answer is.
        ? `You're here now. ${s.base} (You said: "${goal}")`
        : s.year === year
          ? `You're here now. ${s.base}`
          : s.base,
    order: s.year - 1,
  }));

  // Y3/Y4 are conversion/placement-focused; nudge the internship copy accordingly.
  const senior = year >= 3;
  const cat = CATALOGS[program];
  const baseOpportunities: RoadmapItemSpec[] = [
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

  // Domain answer (from discover_domain's menu) gets its own curated catalog,
  // ADDED alongside the base hackathon/internship items above (not replacing
  // them -- a domain-track student still needs real hackathons/internships,
  // this just adds a specialization track on top). itemId prefixed `domain-`
  // so the UI can render it as its own "your {domain} roadmap" panel, separate
  // from both the universal milestone spine and the base opportunities.
  const domainCatalog = answers.domain ? DOMAIN_CATALOG[answers.domain] : undefined;
  const domainItems: RoadmapItemSpec[] = domainCatalog
    ? domainCatalog.map((o, i) => ({
        itemId: o.itemId,
        category: 'oss' as const,
        title: o.title,
        description: o.description,
        link: o.link,
        order: STAGES.length + baseOpportunities.length + i,
      }))
    : [];

  return [...milestones, ...baseOpportunities, ...domainItems];
}
