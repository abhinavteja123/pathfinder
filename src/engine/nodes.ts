import type { EngineNode } from './types';

/**
 * Compact but real per-stage graphs for the four year-stages (Discover/Build/
 * Convert/Launch), each with a "continue" path (has history) and a "catchup"
 * path (first contact at that year). Copy is intentionally light -- this is
 * architecture scaffolding, not final content.
 */
export const NODES: Record<string, EngineNode> = {
  // ---- Y1: Discover ----
  discover_intro: {
    id: 'discover_intro',
    kind: 'fixed',
    say: "Hey! I'm Pathfinder. Before you dive into the portal, let's talk for a minute -- what's actually exciting you right now?",
    options: [{ label: "Let's go", next: 'discover_goal' }],
  },
  discover_goal: {
    id: 'discover_goal',
    kind: 'llm',
    systemPrompt:
      "You are Pathfinder, a warm, curious campus companion bot talking to a 1st-year student. Ask an open, creative question about what their goal or dream feels like right now -- not a form question. Keep it to 1-2 sentences.",
    captureAs: 'goal',
    next: 'discover_interests',
  },
  discover_interests: {
    id: 'discover_interests',
    kind: 'hybrid',
    slots: ['interests'],
    phrasingPrompt:
      'You are Pathfinder. Given the student just shared their goal, ask casually what they enjoy doing or are curious about -- phrase it naturally, not like a form field.',
    next: 'discover_wrapup',
  },
  discover_wrapup: {
    id: 'discover_wrapup',
    kind: 'fixed',
    say: "Love it. I'm putting together your first roadmap now -- let's go explore the portal.",
    terminal: true,
  },

  // ---- Y2: Build ----
  build_continue: {
    id: 'build_continue',
    kind: 'fixed',
    say: "Welcome back! Last time you told me you were chasing {answers.goal}. How's that been going?",
    next: 'build_activity_check',
  },
  build_activity_check: {
    id: 'build_activity_check',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder talking to a 2nd-year student. Ask a warm, specific follow-up about what skills they have built or which applications/hackathons they have tried so far.',
    captureAs: 'activity_note',
    next: 'build_wrapup',
  },
  build_wrapup: {
    id: 'build_wrapup',
    kind: 'fixed',
    say: 'Good progress. Updating your roadmap with a few internships and hackathons worth trying next.',
    terminal: true,
  },
  build_catchup_intro: {
    id: 'build_catchup_intro',
    kind: 'fixed',
    say: "Hey, first time we're talking -- even though you're already in year 2! Quick catch-up: what are you aiming for?",
    options: [{ label: "Let's go", next: 'build_catchup_goal' }],
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
    kind: 'hybrid',
    slots: ['interests'],
    phrasingPrompt:
      'You are Pathfinder. Ask what the student has been building or exploring so far this year -- keep it natural.',
    next: 'build_wrapup',
  },

  // ---- Y3: Convert ----
  convert_continue: {
    id: 'convert_continue',
    kind: 'fixed',
    say: "You're in the thick of it now. Last we spoke you mentioned {answers.goal} -- how are internship-to-PPO conversations looking?",
    next: 'convert_ppo_check',
  },
  convert_ppo_check: {
    id: 'convert_ppo_check',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder talking to a 3rd-year student. Ask specifically and supportively about their internship-to-PPO conversion plans or targeted hackathons/case comps.',
    captureAs: 'conversion_plan',
    next: 'convert_track',
  },
  convert_track: {
    id: 'convert_track',
    kind: 'hybrid',
    slots: ['specialization'],
    phrasingPrompt:
      'You are Pathfinder. Ask which specialization or track the student wants to double down on this year -- phrase it naturally.',
    next: 'convert_wrapup',
  },
  convert_wrapup: {
    id: 'convert_wrapup',
    kind: 'fixed',
    say: "Solid. I'm lining up a focused roadmap for converting your {answers.specialization} track into real offers.",
    terminal: true,
  },
  convert_catchup_intro: {
    id: 'convert_catchup_intro',
    kind: 'fixed',
    say: "First time meeting -- year 3 already! Let's get you a fast, focused catch-up. What's the goal?",
    options: [{ label: "Let's go", next: 'convert_catchup_goal' }],
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
    say: "Final stretch. Looking back at everything -- {answers.goal}, {answers.conversion_plan} -- how's the placement season treating you?",
    next: 'launch_offer_check',
  },
  launch_offer_check: {
    id: 'launch_offer_check',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder talking to a final-year student under time pressure. Ask supportively about offers in hand, interview prep needs, or evaluation/negotiation questions. Keep it brief and urgent-but-kind.',
    captureAs: 'offer_status',
    next: 'launch_higher_studies',
  },
  launch_higher_studies: {
    id: 'launch_higher_studies',
    kind: 'hybrid',
    slots: ['higher_studies_interest'],
    phrasingPrompt:
      'You are Pathfinder. Ask briefly whether the student is also considering higher studies as a parallel path, alongside placements.',
    next: 'launch_wrapup',
  },
  launch_wrapup: {
    id: 'launch_wrapup',
    kind: 'fixed',
    say: "You've come a long way since {answers.goal}. Here's your final-stretch roadmap -- let's get you across the line.",
    terminal: true,
  },
  launch_catchup_intro: {
    id: 'launch_catchup_intro',
    kind: 'fixed',
    say: "First time talking, and it's final year -- let's move fast. What's the target: placement, higher studies, or both?",
    options: [{ label: "Let's go", next: 'launch_catchup_goal' }],
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
