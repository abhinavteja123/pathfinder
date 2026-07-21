import { resolveEntryNode } from './entry-state';
import { requireNode } from './content-loader';
import type { AnimationState, Arm, EngineContext, EngineNode, Gesture, TurnRequest, TurnResponse } from './types';

/** Resolves a node's menu for the student: per-answer override first
 * (optionsByAnswer, keyed by any captured answer, e.g. domain), then per-branch
 * (optionsByBranch, keyed by the login-seeded answers.branch), then per-program
 * (optionsByProgram), else the default options list. */
function nodeOptions(node: EngineNode, ctx: EngineContext) {
  const byAnswer =
    node.optionsByAnswer && ctx.answers[node.optionsByAnswer.key]
      ? node.optionsByAnswer.map[ctx.answers[node.optionsByAnswer.key]]
      : undefined;
  const byBranch = ctx.answers.branch ? node.optionsByBranch?.[ctx.answers.branch] : undefined;
  return byAnswer ?? byBranch ?? node.optionsByProgram?.[ctx.program] ?? node.options;
}

/** multiSelect flag for TurnResponse -- only set (true) on multi nodes. */
function multiFlag(node: EngineNode): true | undefined {
  return node.multi ? true : undefined;
}

/** Point for one banded answer; unanswered = middle of the band (1). */
function score(value: string | undefined, points: Record<string, number>): number {
  return value !== undefined && value in points ? points[value] : 1;
}

/** Y3 placement readiness from convert/launch answers. Keys and option labels
 * match the convert_readiness_rate / convert_resume_status / launch_mock_status
 * menus verbatim. Max 6 points; all-missing lands the middle band. */
export function readinessBand(answers: Record<string, string>): string {
  const total =
    score(answers.readiness_dsa, { strong: 2, okay: 1, weak: 0 }) +
    score(answers.resume_status, { 'recruiter-ready': 2, drafted: 1, "doesn't exist": 0 }) +
    score(answers.mock_status, { regular: 2, '1–2': 1, none: 0 });
  return total >= 5 ? 'on track' : total >= 3 ? 'not quite there yet' : "at risk — let's fix that";
}

/** Y2 building momentum from build_project_count / build_dsa_status answers. */
export function momentumBand(answers: Record<string, string>): string {
  const total =
    score(answers.project_count, { '0': 0, '1': 1, '2–3': 2, '4+': 2 }) +
    score(answers.dsa_status, { 'not started': 0, sometimes: 1, 'daily-ish': 2 });
  return total >= 3 ? 'building real momentum' : total >= 2 ? 'warming up' : 'just getting started';
}

/** Y1 package-goal push line for the roadmap intro -- tone from
 * answers.package_goal + answers.branch (labels match discover_package's menu
 * verbatim). Empty string when package_goal is missing, or when a 50+ goal has
 * no CSE/core branch to tone it for (e.g. BBA). */
export function packagePush(answers: Record<string, string>): string {
  if (answers.package_goal === 'Below 50 LPA') {
    return 'Steady path: consistent skills + real projects gets you there comfortably. ';
  }
  if (answers.package_goal === 'Above 50 LPA') {
    if (answers.branch === 'CSE') {
      return 'That 50+ goal means top-company bar: DSA daily, standout projects, referrals. ';
    }
    if (['ECE', 'EEE', 'Civil', 'Mechanical'].includes(answers.branch)) {
      return 'That 50+ goal in core means top-lane: GATE top ranks or the best core companies — certifications and GPA carry real weight. ';
    }
    if (!answers.branch) {
      // No engineering branch => BBA/business track.
      return 'That 50+ goal is the premium lane — top consulting, product and finance roles hire on sharp case-cracking and a standout profile. ';
    }
  }
  return '';
}

function interpolate(text: string, ctx: EngineContext): string {
  return text
    .replace(/\{answers\.(\w+)\}/g, (_, key: string) => ctx.answers[key] ?? '')
    .replace(/\{roadmapProgress\}/g, ctx.roadmapProgress ?? '')
    .replace(/\{readinessBand\}/g, () => readinessBand(ctx.answers))
    .replace(/\{momentumBand\}/g, () => momentumBand(ctx.answers))
    .replace(/\{packagePush\}/g, () => packagePush(ctx.answers));
}

interface RenderResult {
  say: string;
  animationState: AnimationState;
  gesture?: Gesture;
  arm?: Arm;
}

/** Every node is authored/static now (no LLM): resolve sayByAnswer (or fall back
 * to the node's plain `say`), interpolate the profile placeholders, done. */
function renderNode(node: EngineNode, ctx: EngineContext): RenderResult {
  const raw = node.sayByAnswer
    ? (node.sayByAnswer.map[ctx.answers[node.sayByAnswer.key]] ?? node.sayByAnswer.fallback ?? node.say)
    : node.say;
  return { say: interpolate(raw, ctx), animationState: 'talking', gesture: node.gesture, arm: node.arm };
}

/**
 * Executes one conversation turn. `req.nodeId === 'start'` begins/resumes a
 * session by resolving the (year, hasHistory, reengagementDue) entry node;
 * otherwise `req.nodeId` is the node the student is responding to.
 */
export function processTurn(ctx: EngineContext, req: TurnRequest): TurnResponse {
  if (req.nodeId === 'start') {
    const entryNode = requireNode(resolveEntryNode(ctx.year, ctx.hasHistory, ctx.reengagementDue));
    const { say, animationState, gesture, arm } = renderNode(entryNode, ctx);
    return {
      nodeId: entryNode.id,
      say,
      options: nodeOptions(entryNode, ctx),
      multiSelect: multiFlag(entryNode),
      animationState,
      stageComplete: !!entryNode.terminal,
      gesture,
      arm,
    };
  }

  const current = requireNode(req.nodeId);
  if (req.input !== undefined && current.captureAs) {
    ctx.answers[current.captureAs] = req.input;
  }

  let nextId: string;
  const currentOptions = nodeOptions(current, ctx);
  if (current.multi && current.next) {
    // Multi-select input is a comma-joined label string ("Git, SQL") -- it will
    // never equal one option label, so skip matching; captureAs above already
    // stored it whole, and the node advances on its single `next`.
    nextId = current.next;
  } else if (currentOptions) {
    const match = currentOptions.find((o) => o.label === req.input);
    nextId = (match ?? currentOptions[0]).next;
  } else if (current.next) {
    nextId = current.next;
  } else {
    throw new Error(`Node ${current.id} has no outgoing edge`);
  }

  const nextNode = requireNode(nextId);
  const { say, animationState, gesture, arm } = renderNode(nextNode, ctx);

  return {
    nodeId: nextNode.id,
    say,
    options: nodeOptions(nextNode, ctx),
    multiSelect: multiFlag(nextNode),
    animationState,
    stageComplete: !!nextNode.terminal,
    gesture,
    arm,
  };
}
