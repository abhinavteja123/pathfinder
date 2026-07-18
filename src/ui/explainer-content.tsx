import type { ReactNode } from 'react';

export interface ExplainerSlide {
  key: string;
  title: string;
  body: string;
  gesture: 'wave' | 'thumbsup' | 'peace' | 'stop' | 'handshake';
  arm: 'left' | 'right';
  visual: ReactNode;
}

/** Real brand marks (path data from simple-icons, CC0) -- used purely to
 * identify the site, not a UI kit component: nominative use, same as any
 * "Connect your GitHub" button would show. */
function GitHubMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="#ffffff">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="#ffffff">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/** These platforms have no iconic globally-recognized mark the way GitHub/
 * LinkedIn do (or tracing them precisely wasn't worth the fetch for a minor
 * slide) -- clean generic glyphs on the platform's real brand color instead. */
function BriefcaseIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4v1a4 4 0 0 0 3.5 4M17 5h3v1a4 4 0 0 1-3.5 4M12 13v4M9 20h6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function CodeBracketsIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4 3 12l5 8M16 4l5 8-5 8" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9 12 4l10 5-10 5-10-5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4V4Z" />
    </svg>
  );
}

function BanknoteIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M5.5 12h.01M18.5 12h.01" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" />
    </svg>
  );
}

/** Browser-chrome mockup (traffic-light dots + colored "page") so a slide
 * reads as a photo/screenshot of the actual site, not just an icon badge. */
export function BrowserFrame({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[15rem] overflow-hidden rounded-xl border border-white/10 shadow-lg">
      <div className="flex items-center gap-1.5 bg-black/50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-8" style={{ backgroundColor: bg }}>
        {children}
      </div>
    </div>
  );
}

/** Pool of mid-conversation explainer beats -- "important things for BTech
 * students". PathfinderChat picks 5 at random (see `shuffle`) and fires them
 * as one contiguous batch right after the conversation's transition line,
 * NOT a pre-chat tour and NOT spread across every question -- the user
 * explicitly wants "let's dive in" -> one explore phase -> back to wrapping up. */
export const EXPLAINER_SLIDES: ExplainerSlide[] = [
  {
    key: 'github',
    title: 'This is GitHub',
    body: 'Where you host code and build a public portfolio of real, working projects. Recruiters actually check this.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#181717">
        <GitHubMark />
        <span className="font-display text-base font-semibold text-white">GitHub</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'linkedin',
    title: 'This is LinkedIn',
    body: 'Your professional profile -- resume, network, and where recruiters and alumni actually find you.',
    gesture: 'handshake',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#0A66C2">
        <LinkedInMark />
        <span className="font-display text-base font-semibold text-white">LinkedIn</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'internshala',
    title: 'This is Internshala',
    body: "Where you'll actually find and apply to internships matched to your year. It's in your roadmap too.",
    gesture: 'peace',
    arm: 'left',
    visual: (
      <BrowserFrame bg="#0d6efd">
        <BriefcaseIcon />
        <span className="font-display text-base font-semibold text-white">Internshala</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'devfolio',
    title: 'This is Devfolio',
    body: "India's biggest hackathon platform -- browse, register, and ship a project in a weekend.",
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#6C3CE9">
        <TrophyIcon />
        <span className="font-display text-base font-semibold text-white">Devfolio</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'kaggle',
    title: 'This is Kaggle',
    body: 'Real datasets, ML competitions, and notebooks -- great if data/AI is your thing.',
    gesture: 'peace',
    arm: 'left',
    visual: (
      <BrowserFrame bg="#20BEFF">
        <ChartIcon />
        <span className="font-display text-base font-semibold text-white">Kaggle</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'leetcode',
    title: 'This is LeetCode',
    body: 'Where you practice the coding problems that actually show up in interviews.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#1a1a1a">
        <CodeBracketsIcon />
        <span className="font-display text-base font-semibold text-white">LeetCode</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'coursera',
    title: 'This is Coursera',
    body: 'Structured courses from real universities and companies -- good for going deep on a topic.',
    gesture: 'handshake',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#0056D2">
        <GraduationCapIcon />
        <span className="font-display text-base font-semibold text-white">Coursera</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'stackoverflow',
    title: 'This is Stack Overflow',
    body: "Stuck on an error? Someone's already asked and answered it here.",
    gesture: 'peace',
    arm: 'left',
    visual: (
      <BrowserFrame bg="#F48024">
        <ChatIcon />
        <span className="font-display text-base font-semibold text-white">Stack Overflow</span>
      </BrowserFrame>
    ),
  },
];

/** Year 2 "Build" beats -- practice, hackathons, portfolio, open source. */
const Y2_SLIDES: ExplainerSlide[] = [
  {
    key: 'leetcode-basics',
    title: 'Start LeetCode basics',
    body: 'Second year is when DSA practice starts paying off — a few easy problems a day beats a cram later.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#1a1a1a">
        <CodeBracketsIcon />
        <span className="font-display text-base font-semibold text-white">LeetCode</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'devfolio-hackathons',
    title: 'Hackathons on Devfolio',
    body: 'Team up, build something in a weekend, and walk away with a project, a certificate, and a network.',
    gesture: 'peace',
    arm: 'left',
    visual: (
      <BrowserFrame bg="#6C3CE9">
        <TrophyIcon />
        <span className="font-display text-base font-semibold text-white">Devfolio</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'github-readme',
    title: 'Your GitHub README portfolio',
    body: 'Pin your best repos and write a profile README — it is the first thing anyone sees on your profile.',
    gesture: 'handshake',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#181717">
        <GitHubMark />
        <span className="font-display text-base font-semibold text-white">GitHub</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'gsoc',
    title: 'Google Summer of Code',
    body: 'Get paid to contribute to real open source with a mentor. Applications open early — start prepping now.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#4285F4">
        <GraduationCapIcon />
        <span className="font-display text-base font-semibold text-white">GSoC</span>
      </BrowserFrame>
    ),
  },
];

/** Year 3 "Convert" beats -- interview prep and getting in the door. */
const Y3_SLIDES: ExplainerSlide[] = [
  {
    key: 'levelsfyi',
    title: 'This is Levels.fyi',
    body: 'Real salary data by company and level — know what an offer should look like before you interview.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#0E2439">
        <ChartIcon />
        <span className="font-display text-base font-semibold text-white">Levels.fyi</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'glassdoor',
    title: 'This is Glassdoor',
    body: 'Interview reviews from people who actually sat the interview — read them before every company round.',
    gesture: 'peace',
    arm: 'left',
    visual: (
      <BrowserFrame bg="#0CAA41">
        <ChatIcon />
        <span className="font-display text-base font-semibold text-white">Glassdoor</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'linkedin-referrals',
    title: 'LinkedIn referral DMs',
    body: 'A short, specific DM to an alum or employee can get you referred — referrals beat cold applications.',
    gesture: 'handshake',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#0A66C2">
        <LinkedInMark />
        <span className="font-display text-base font-semibold text-white">LinkedIn</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'system-design-primer',
    title: 'system-design-primer',
    body: 'The free GitHub repo everyone preps system design interviews with — star it and work through it.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#181717">
        <GitHubMark />
        <span className="font-display text-base font-semibold text-white">GitHub</span>
      </BrowserFrame>
    ),
  },
];

/** Year 4 "Launch" beats -- offers, exams, off-campus, interviews. */
const Y4_SLIDES: ExplainerSlide[] = [
  {
    key: 'salary-negotiation',
    title: 'Negotiate your offer',
    body: 'The first number is rarely the final one. A polite counter backed by market data can add lakhs.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#15803d">
        <BanknoteIcon />
        <span className="font-display text-base font-semibold text-white">Negotiation</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'gate-gre',
    title: 'GATE & GRE lanes',
    body: 'Higher studies? GATE for IITs and PSUs, GRE for abroad — both need months of prep, so pick a lane early.',
    gesture: 'peace',
    arm: 'left',
    visual: (
      <BrowserFrame bg="#5E35B1">
        <GraduationCapIcon />
        <span className="font-display text-base font-semibold text-white">GATE / GRE</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'naukri',
    title: 'This is Naukri',
    body: 'Off-campus drives and fresher openings live here — set job alerts and keep your profile fresh.',
    gesture: 'handshake',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#275DF5">
        <BriefcaseIcon />
        <span className="font-display text-base font-semibold text-white">Naukri</span>
      </BrowserFrame>
    ),
  },
  {
    key: 'star-method',
    title: 'The STAR method',
    body: 'Situation, Task, Action, Result — the structure for every behavioral answer. Practice your stories in it.',
    gesture: 'thumbsup',
    arm: 'right',
    visual: (
      <BrowserFrame bg="#F59E0B">
        <StarIcon />
        <span className="font-display text-base font-semibold text-white">STAR</span>
      </BrowserFrame>
    ),
  },
];

/** Per-year explainer pools -- PathfinderChat picks by its `year` prop.
 * Year 1 keeps the original discovery pool above. */
export const EXPLAINER_POOLS: Record<1 | 2 | 3 | 4, ExplainerSlide[]> = {
  1: EXPLAINER_SLIDES,
  2: Y2_SLIDES,
  3: Y3_SLIDES,
  4: Y4_SLIDES,
};

/** Y1 profile-building tour, in the flow chart's order: LeetCode + GitHub
 * profile FIRST (the "build your profile" previews), then internships
 * (Internshala), hackathons (Devfolio), and open source (GSoC, borrowed from
 * the Y2 pool). Deterministic -- no shuffle -- so every fresh Y1 student gets
 * exactly this walkthrough. */
export const Y1_PROFILE_TOUR: ExplainerSlide[] = ['leetcode', 'github', 'internshala', 'devfolio', 'gsoc']
  .map((key) => [...EXPLAINER_SLIDES, ...EXPLAINER_POOLS[2]].find((s) => s.key === key))
  .filter((s): s is ExplainerSlide => s !== undefined);

/** Fisher-Yates -- used to pick "any 5 random" of the pool above per conversation. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
