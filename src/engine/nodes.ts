import type { EngineNode } from './types';

/**
 * Compact but real per-stage graphs for the four year-stages (Discover/Build/
 * Convert/Launch), each with a "continue" path (has history) and a "catchup"
 * path (first contact at that year). Copy is intentionally light -- this is
 * architecture scaffolding, not final content.
 */
export const NODES: Record<string, EngineNode> = {
  // ---- Y1: Discover ----
  // Flow: greet -> hobbies -> goal -> domain (menu, scripted -- not LLM-guessed)
  // -> 2 domain-aware follow-ups -> transition (client interleaves explainer
  // slides here, see PathfinderChat) -> wrapup (both roadmaps generated).
  discover_intro: {
    id: 'discover_intro',
    kind: 'fixed',
    say: "Hi! I'm Pathfinder -- your companion here. Good to meet you!",
    options: [{ label: "Let's go", next: 'discover_hobbies' }],
    gesture: 'wave',
    arm: 'right',
  },
  discover_hobbies: {
    id: 'discover_hobbies',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder, a warm, curious campus companion bot talking to a 1st-year student. Ask casually what they like doing for fun outside of academics -- hobbies, interests -- not a form question. Keep it to 1-2 sentences.',
    captureAs: 'hobbies',
    next: 'discover_goal',
  },
  discover_goal: {
    id: 'discover_goal',
    kind: 'llm',
    systemPrompt:
      "You are Pathfinder, a warm, curious campus companion bot talking to a 1st-year student. Ask an open, creative question about what their goal or dream feels like right now -- not a form question. Keep it to 1-2 sentences.",
    captureAs: 'goal',
    next: 'discover_domain',
  },
  discover_domain: {
    id: 'discover_domain',
    kind: 'fixed',
    say: 'Cool. Which field are you most into right now?',
    options: [
      { label: 'AI/ML', next: 'discover_domain_q1' },
      { label: 'Cybersecurity', next: 'discover_domain_q1' },
      { label: 'IoT', next: 'discover_domain_q1' },
      { label: 'ECE', next: 'discover_domain_q1' },
      { label: 'EEE', next: 'discover_domain_q1' },
      { label: 'Web Dev', next: 'discover_domain_q1' },
      { label: 'Cloud/DevOps', next: 'discover_domain_q1' },
      { label: 'Mobile Dev', next: 'discover_domain_q1' },
      { label: 'Blockchain', next: 'discover_domain_q1' },
      { label: 'Data Science', next: 'discover_domain_q1' },
    ],
    captureAs: 'domain',
  },
  // Scripted, not LLM-generated: the domain menu already gives a deterministic
  // key, so a canned per-domain question costs zero tokens and is just as
  // relevant as an LLM-generated one would be. Cuts 2 of the flow's LLM calls.
  discover_domain_q1: {
    id: 'discover_domain_q1',
    kind: 'fixed',
    say: 'What draws you to that field the most?',
    sayByAnswer: {
      key: 'domain',
      fallback: 'What draws you to that field the most?',
      map: {
        'AI/ML': 'Are you more curious about how AI models actually learn, or more into the cool stuff you can build with them?',
        Cybersecurity: 'Is it the hacker/puzzle-solving side that pulls you in, or more the idea of protecting systems and data?',
        IoT: 'Are you more into the physical gadgets and sensors side, or the idea of connecting everyday things to the internet?',
        ECE: 'Are you more into the hardware/circuits side, or the signal-processing/software side?',
        EEE: 'Are you leaning more toward power systems, or control systems and automation?',
        'Web Dev': 'Frontend, backend, or do you like doing both end to end?',
        'Cloud/DevOps': 'Is it the idea of running apps at massive scale that excites you, or more the automation/DevOps side of things?',
        'Mobile Dev': 'iOS, Android, or cross-platform stuff like Flutter or React Native?',
        Blockchain: 'Is it the decentralization idea that hooks you, or more the tech behind smart contracts and crypto?',
        'Data Science': 'Do you enjoy the analysis and stats side more, or the visualization and storytelling side?',
      },
    },
    captureAs: 'domain_note1',
    next: 'discover_domain_q2',
  },
  discover_domain_q2: {
    id: 'discover_domain_q2',
    kind: 'fixed',
    say: "Have you built or tried anything hands-on in that space yet, even something small?",
    captureAs: 'domain_note2',
    next: 'discover_transition',
  },
  discover_transition: {
    id: 'discover_transition',
    kind: 'fixed',
    say: "Awesome, that helps a ton. Before we wrap up, let me show you a few important things -- ready?",
    options: [{ label: "Let's go", next: 'discover_wrapup' }],
    gesture: 'wave',
    arm: 'right',
  },
  discover_wrapup: {
    id: 'discover_wrapup',
    kind: 'fixed',
    say: "Here's your roadmap -- your own journey, plus your {answers.domain} track, built just for you.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },

  // ---- Y2: Build ----
  build_continue: {
    id: 'build_continue',
    kind: 'fixed',
    say: "Welcome back! Last time you told me you were chasing {answers.goal}. {roadmapProgress}How's that been going?",
    next: 'build_activity_check',
    gesture: 'handshake',
    arm: 'right',
  },
  build_activity_check: {
    id: 'build_activity_check',
    kind: 'fixed',
    say: 'What have you been building or trying lately -- any hackathons or side projects worth bragging about?',
    captureAs: 'activity_note',
    next: 'build_wrapup',
  },
  build_wrapup: {
    id: 'build_wrapup',
    kind: 'fixed',
    say: 'Good progress. Updating your roadmap with a few internships and hackathons worth trying next.',
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  build_catchup_intro: {
    id: 'build_catchup_intro',
    kind: 'fixed',
    say: "Hey, first time we're talking -- even though you're already in year 2! Quick catch-up: what are you aiming for?",
    options: [{ label: "Let's go", next: 'build_catchup_goal' }],
    gesture: 'wave',
    arm: 'right',
  },
  build_catchup_goal: {
    id: 'build_catchup_goal',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder meeting a 2nd-year student for the first time. Ask about their goal in a casual, creative way.',
    captureAs: 'goal',
    next: 'build_catchup_activity',
  },
  build_catchup_activity: {
    id: 'build_catchup_activity',
    kind: 'fixed',
    say: 'So what have you actually gotten your hands on so far this year -- any projects, clubs, hackathons?',
    captureAs: 'interests',
    next: 'build_wrapup',
  },

  // ---- Y3: Convert ----
  convert_continue: {
    id: 'convert_continue',
    kind: 'fixed',
    say: "You're in the thick of it now. Last we spoke you mentioned {answers.goal}. {roadmapProgress}How are internship-to-PPO conversations looking?",
    next: 'convert_ppo_check',
    gesture: 'handshake',
    arm: 'right',
  },
  convert_ppo_check: {
    id: 'convert_ppo_check',
    kind: 'fixed',
    say: "Give me specifics -- any offer talks in progress, or hackathons/case comps you're using to strengthen your case?",
    captureAs: 'conversion_plan',
    next: 'convert_track',
  },
  convert_track: {
    id: 'convert_track',
    kind: 'fixed',
    say: 'Time to get specific -- which track or specialization are you doubling down on to make yourself hire-ready this year?',
    captureAs: 'specialization',
    next: 'convert_wrapup',
  },
  convert_wrapup: {
    id: 'convert_wrapup',
    kind: 'fixed',
    say: "Solid. I'm lining up a focused roadmap for converting your {answers.specialization} track into real offers.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  convert_catchup_intro: {
    id: 'convert_catchup_intro',
    kind: 'fixed',
    say: "First time meeting -- year 3 already! Let's get you a fast, focused catch-up. What's the goal?",
    options: [{ label: "Let's go", next: 'convert_catchup_goal' }],
    gesture: 'wave',
    arm: 'right',
  },
  convert_catchup_goal: {
    id: 'convert_catchup_goal',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder meeting a 3rd-year student for the first time. Ask about their goal, conversationally, with an eye toward internship-to-PPO conversion since they are time-pressured.',
    captureAs: 'goal',
    next: 'convert_track',
  },

  // ---- Y4: Launch ----
  launch_continue: {
    id: 'launch_continue',
    kind: 'fixed',
    say: "Final stretch. Looking back at everything -- {answers.goal}, {answers.conversion_plan}. {roadmapProgress}How's the placement season treating you?",
    next: 'launch_offer_check',
    gesture: 'handshake',
    arm: 'right',
  },
  launch_offer_check: {
    id: 'launch_offer_check',
    kind: 'fixed',
    say: 'Placement crunch time -- where do you stand on offers, or what interview prep do you need most right now?',
    captureAs: 'offer_status',
    next: 'launch_higher_studies',
  },
  launch_higher_studies: {
    id: 'launch_higher_studies',
    kind: 'fixed',
    say: "Quick one, since time's tight -- placements only, or are you weighing higher studies too?",
    captureAs: 'higher_studies_interest',
    next: 'launch_wrapup',
  },
  launch_wrapup: {
    id: 'launch_wrapup',
    kind: 'fixed',
    say: "You've come a long way since {answers.goal}. Here's your final-stretch roadmap -- let's get you across the line.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  launch_catchup_intro: {
    id: 'launch_catchup_intro',
    kind: 'fixed',
    say: "First time talking, and it's final year -- let's move fast. What's the target: placement, higher studies, or both?",
    options: [{ label: "Let's go", next: 'launch_catchup_goal' }],
    gesture: 'wave',
    arm: 'right',
  },
  launch_catchup_goal: {
    id: 'launch_catchup_goal',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder meeting a final-year student for the first time. Ask their goal quickly and warmly, aware they are time-pressured.',
    captureAs: 'goal',
    next: 'launch_offer_check',
  },
};

export function requireNode(id: string): EngineNode {
  const node = NODES[id];
  if (!node) throw new Error(`Unknown node: ${id}`);
  return node;
}
