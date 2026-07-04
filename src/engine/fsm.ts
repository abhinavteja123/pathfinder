import { resolveEntryNode } from './entry-state';
import { requireNode } from './nodes';
import { composeMessages } from './voice';
import type { LlmRouter } from './llm-router';
import type { AnimationState, EngineContext, EngineNode, TurnRequest, TurnResponse } from './types';

function interpolate(text: string, ctx: EngineContext): string {
  return text.replace(/\{answers\.(\w+)\}/g, (_, key: string) => ctx.answers[key] ?? '');
}

async function renderNode(
  node: EngineNode,
  ctx: EngineContext,
  router: LlmRouter
): Promise<{ say: string; animationState: AnimationState }> {
  if (node.kind === 'fixed') {
    return { say: interpolate(node.say, ctx), animationState: 'talking' };
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
    const { say, animationState } = await renderNode(entryNode, ctx, router);
    return {
      nodeId: entryNode.id,
      say,
      options: entryNode.kind === 'fixed' ? entryNode.options : undefined,
      animationState,
      stageComplete: !!entryNode.terminal,
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
  if (current.kind === 'fixed' && current.options) {
    const match = current.options.find((o) => o.label === req.input);
    nextId = (match ?? current.options[0]).next;
  } else if ('next' in current && current.next) {
    nextId = current.next;
  } else {
    throw new Error(`Node ${current.id} has no outgoing edge`);
  }

  const nextNode = requireNode(nextId);
  const { say, animationState } = await renderNode(nextNode, ctx, router);

  return {
    nodeId: nextNode.id,
    say,
    options: nextNode.kind === 'fixed' ? nextNode.options : undefined,
    animationState,
    stageComplete: !!nextNode.terminal,
  };
}
