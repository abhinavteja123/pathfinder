import { CONTENT_PACKS } from './content-packs';
import type { ChatMessage, EngineContext } from './types';

/**
 * Shared persona applied to EVERY generated turn (llm + hybrid). This is what
 * makes the bot read as a human campus senior instead of a corporate assistant:
 * short, reactive, one question at a time. Length is enforced HERE (in the
 * prompt) because it is the only lever that works on both providers -- Groq's
 * max_tokens clamps output but Gemini's config is separate, and neither makes
 * the model *sound* brief on its own. See llm-router for the token caps.
 */
export const PATHFINDER_VOICE = `You are Pathfinder -- a warm, upbeat campus senior who genuinely cares, texting a junior. You are NOT a corporate assistant.

Hard rules, always:
- Keep it SHORT. One or two sentences max. If one works, use one.
- Ask at most ONE question, and only if it moves things forward.
- React to what they actually said before you ask anything -- sound like you were listening, not running a form.
- Talk casual and human. Contractions, warmth, a little energy.
- No bullet lists, no headings, no numbered steps, no markdown.
- At most one emoji, and only when it truly fits. Usually none.
- Never re-ask something they already told you.`;

/**
 * Compact, omit-empty "who am I talking to" line. Critical that empty answers
 * are dropped -- the first llm node (discover_goal) fires before anything is
 * captured, so a naive template would send "goal: ; interests: " on turn one.
 * Year/program always render (real context that steers tone + which activities
 * to suggest); captured answers are added as they accrue.
 */
export function buildProfileLine(ctx: EngineContext): string {
  const pack = CONTENT_PACKS[ctx.program];
  const bits: string[] = [`Year ${ctx.year} ${ctx.program} student`];
  if (ctx.answers.branch) bits.push(`branch: ${ctx.answers.branch}`);
  if (ctx.answers.goal) bits.push(`their goal: ${ctx.answers.goal}`);
  if (ctx.answers.hobbies) bits.push(`hobbies: ${ctx.answers.hobbies}`);
  if (ctx.answers.domain) bits.push(`chosen field: ${ctx.answers.domain}`);
  if (ctx.answers.interests) bits.push(`into: ${ctx.answers.interests}`);
  if (ctx.answers.specialization) bits.push(`track: ${ctx.answers.specialization}`);
  if (ctx.answers.conversion_plan) bits.push(`conversion plan: ${ctx.answers.conversion_plan}`);
  if (ctx.answers.offer_status) bits.push(`offers: ${ctx.answers.offer_status}`);
  return `Who you're talking to -- ${bits.join('; ')}. When you mention opportunities, think ${pack.activityNoun}.`;
}

/**
 * Composes the full message list for a generated turn: persona + profile +
 * this node's task, then recent history so replies are context-aware. Used for
 * both llm and hybrid nodes (hybrid previously sent NO history -- that was why
 * its questions felt disconnected from the conversation).
 */
export function composeMessages(ctx: EngineContext, task: string): ChatMessage[] {
  const system = `${PATHFINDER_VOICE}\n\n${buildProfileLine(ctx)}\n\nRight now: ${task}`;
  return [{ role: 'system', content: system }, ...ctx.history];
}
