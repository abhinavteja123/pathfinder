import { resolveEntryNode } from './entry-state';
import { requireNode } from './nodes';
import { composeMessages } from './voice';
import type { LlmRouter } from './llm-router';
import type { AnimationState, Arm, EngineContext, EngineNode, Gesture, TurnRequest, TurnResponse } from './types';

/** Resolves a fixed node's menu for the student: per-branch override first
 * (optionsByBranch, keyed by the login-seeded answers.branch), then per-program
 * (optionsByProgram), else the default options list. */
function nodeOptions(node: EngineNode, ctx: EngineContext) {
  if (node.kind !== 'fixed') return undefined;
  const byBranch = ctx.answers.branch ? node.optionsByBranch?.[ctx.answers.branch] : undefined;
  return byBranch ?? node.optionsByProgram?.[ctx.program] ?? node.options;
}

/** multiSelect flag for TurnResponse -- only set (true) on multi fixed nodes. */
function multiFlag(node: EngineNode): true | undefined {
  return node.kind === 'fixed' && node.multi ? true : undefined;
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
  return total >= 5 ? 'on track 🚀' : total >= 3 ? 'needs focus 🔧' : "at risk — let's fix that ⚡";
}

/** Y2 building momentum from build_project_count / build_dsa_status answers. */
export function momentumBand(answers: Record<string, string>): string {
  const total =
    score(answers.project_count, { '0': 0, '1': 1, '2–3': 2, '4+': 2 }) +
    score(answers.dsa_status, { 'not started': 0, sometimes: 1, 'daily-ish': 2 });
  return total >= 3 ? 'building real momentum' : total >= 2 ? 'warming up' : 'time to ship something small';
}

function interpolate(text: string, ctx: EngineContext): string {
  return text
    .replace(/\{answers\.(\w+)\}/g, (_, key: string) => ctx.answers[key] ?? '')
    .replace(/\{roadmapProgress\}/g, ctx.roadmapProgress ?? '')
    .replace(/\{readinessBand\}/g, () => readinessBand(ctx.answers))
    .replace(/\{momentumBand\}/g, () => momentumBand(ctx.answers));
}

interface RenderResult {
  say: string;
  animationState: AnimationState;
  gesture?: Gesture;
  arm?: Arm;
}

async function renderNode(node: EngineNode, ctx: EngineContext, router: LlmRouter): Promise<RenderResult> {
  if (node.kind === 'fixed') {
    const raw = node.sayByAnswer
      ? (node.sayByAnswer.map[ctx.answers[node.sayByAnswer.key]] ?? node.sayByAnswer.fallback ?? node.say)
      : node.say;
    return { say: interpolate(raw, ctx), animationState: 'talking', gesture: node.gesture, arm: node.arm };
  }
  if (node.kind === 'llm') {
    const result = await router.chat(composeMessages(ctx, node.systemPrompt));
    return { say: result.text, animationState: 'talking' };
  }
  // hybrid -- now gets the persona + profile + history (previously sent none),
  // so the slot-filling question reacts to what was just said.
  const missing = node.slots.filter((s) => !ctx.answers[s]);
  const result = await router.chat(
    composeMessages(ctx, `${node.phrasingPrompt} Ask specifically about: ${missing.join(', ')}.`)
  );
  return { say: result.text, animationState: 'thinking' };
}

/**
 * Executes one conversation turn. `req.nodeId === 'start'` begins/resumes a
 * session by resolving the (year, hasHistory) entry node; otherwise `req.nodeId`
 * is the node the student is responding to.
 */
export async function processTurn(
  ctx: EngineContext,
  req: TurnRequest,
  router: LlmRouter
): Promise<TurnResponse> {
  if (req.nodeId === 'start') {
    const entryNode = requireNode(resolveEntryNode(ctx.year, ctx.hasHistory));
    const { say, animationState, gesture, arm } = await renderNode(entryNode, ctx, router);
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
  if (req.input !== undefined) {
    if (current.kind === 'hybrid') {
      const targetSlot = current.slots.find((s) => !ctx.answers[s]) ?? current.slots[0];
      ctx.answers[targetSlot] = req.input;
    } else if ('captureAs' in current && current.captureAs) {
      ctx.answers[current.captureAs] = req.input;
    }
    // History fetched pre-turn ends at the PRIOR bot question -- the student's
    // reply we're holding in req.input isn't in it yet. Append it so the next
    // node's LLM generation actually reacts to what was just said instead of
    // continuing blind after its own question (which makes llama return empty
    // or emoji-only turns). This is what makes the bot feel like it's listening.
    ctx.history = [...ctx.history, { role: 'user', content: req.input }];
  }

  let nextId: string;
  const currentOptions = nodeOptions(current, ctx);
  if (current.kind === 'fixed' && current.multi && current.next) {
    // Multi-select input is a comma-joined label string ("Git, SQL") -- it will
    // never equal one option label, so skip matching; captureAs above already
    // stored it whole, and the node advances on its single `next`.
    nextId = current.next;
  } else if (currentOptions) {
    const match = currentOptions.find((o) => o.label === req.input);
    nextId = (match ?? currentOptions[0]).next;
  } else if ('next' in current && current.next) {
    nextId = current.next;
  } else {
    throw new Error(`Node ${current.id} has no outgoing edge`);
  }

  const nextNode = requireNode(nextId);
  const { say, animationState, gesture, arm } = await renderNode(nextNode, ctx, router);

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
