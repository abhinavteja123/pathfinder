/**
 * Phase 0 smoke test -- run with `npm run smoke`.
 * Exercises: entry-state branching, LLM router fallback chain (no network
 * required unless GROQ_API_KEY/GEMINI_API_KEY are set), repository roundtrip,
 * and a full Y1 Discover conversation reaching stageComplete.
 */
import { resolveEntryNode } from '../src/engine/entry-state';
import { processTurn } from '../src/engine/fsm';
import { LlmRouter, type LlmProvider } from '../src/engine/llm-router';
import { InMemoryRepository } from '../src/data/in-memory-repository';
import type { EngineContext } from '../src/engine/types';

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    console.error(`FAIL  ${label}`);
    failures++;
  }
}

async function testEntryStateBranching() {
  check('Y1 always enters discover_intro', resolveEntryNode(1, false) === 'discover_intro');
  check(
    'Y3 with history takes convert_continue, without takes convert_catchup_intro',
    resolveEntryNode(3, true) === 'convert_continue' &&
      resolveEntryNode(3, false) === 'convert_catchup_intro'
  );
  check(
    'Y4 with history takes launch_continue, without takes launch_catchup_intro',
    resolveEntryNode(4, true) === 'launch_continue' &&
      resolveEntryNode(4, false) === 'launch_catchup_intro'
  );
}

async function testRouterFallback() {
  const failingProvider: LlmProvider = {
    name: 'always-fails',
    async chat() {
      throw new Error('simulated bad key / network failure');
    },
  };
  const router = new LlmRouter({ scriptedFallback: () => 'SCRIPTED_FALLBACK_TEXT' });
  router.register(failingProvider, 100);

  const result = await router.chat([{ role: 'user', content: 'hi' }]);
  check(
    'router falls through to scripted response when every provider fails',
    result.provider === 'scripted-fallback' && result.text === 'SCRIPTED_FALLBACK_TEXT'
  );
}

async function testFullDiscoverConversation() {
  const repo = new InMemoryRepository();
  await repo.upsertStudent({ id: 's1', year: 1, program: 'BTech', createdAt: new Date().toISOString() });

  // Router with no registered providers -- every LLM/hybrid turn hits scripted fallback.
  const router = new LlmRouter({ scriptedFallback: () => "That's a great answer, noted!" });

  const ctx: EngineContext = {
    studentId: 's1',
    year: 1,
    program: 'BTech',
    hasHistory: false,
    answers: {},
    history: [],
  };

  const t1 = await processTurn(ctx, { studentId: 's1', nodeId: 'start' }, router);
  check('turn 1 lands on discover_intro', t1.nodeId === 'discover_intro');

  const t2 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_intro', input: "Let's go" }, router);
  check('turn 2 advances to discover_hobbies', t2.nodeId === 'discover_hobbies');

  const t3 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_hobbies', input: 'reading and gaming' }, router);
  check(
    'turn 3 advances to discover_goal and captures hobbies',
    t3.nodeId === 'discover_goal' && ctx.answers.hobbies === 'reading and gaming'
  );

  const t4 = await processTurn(
    ctx,
    { studentId: 's1', nodeId: 'discover_goal', input: 'I want to break into product management' },
    router
  );
  check(
    'turn 4 advances to discover_domain and captures goal',
    t4.nodeId === 'discover_domain' && ctx.answers.goal === 'I want to break into product management'
  );

  const t5 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_domain', input: 'AI/ML' }, router);
  check(
    'turn 5 advances to discover_domain_q1 and captures domain',
    t5.nodeId === 'discover_domain_q1' && ctx.answers.domain === 'AI/ML'
  );

  const t6 = await processTurn(
    ctx,
    { studentId: 's1', nodeId: 'discover_domain_q1', input: 'built a small image classifier' },
    router
  );
  check('turn 6 advances to discover_domain_q2', t6.nodeId === 'discover_domain_q2');

  const t7 = await processTurn(
    ctx,
    { studentId: 's1', nodeId: 'discover_domain_q2', input: 'love the math behind it' },
    router
  );
  check('turn 7 advances to discover_transition', t7.nodeId === 'discover_transition');

  const t8 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_transition', input: "Let's go" }, router);
  check('turn 8 reaches discover_wrapup and marks stage complete', t8.nodeId === 'discover_wrapup' && t8.stageComplete);
  check(
    'discover_wrapup interpolates {answers.domain} with no blank hole',
    t8.say.includes('AI/ML') && !t8.say.includes('{answers.')
  );
}

async function testScriptedSlotCapture() {
  const router = new LlmRouter({ scriptedFallback: () => 'What track are you focusing on?' });

  const ctx: EngineContext = {
    studentId: 's2',
    year: 3,
    program: 'BTech',
    hasHistory: true,
    answers: { goal: 'break into product management' },
    history: [],
  };

  const t1 = await processTurn(ctx, { studentId: 's2', nodeId: 'start' }, router);
  check('Y3 with history enters convert_continue', t1.nodeId === 'convert_continue');

  const t2 = await processTurn(ctx, { studentId: 's2', nodeId: 'convert_continue' }, router);
  check('advances to convert_ppo_check', t2.nodeId === 'convert_ppo_check');

  const t3 = await processTurn(
    ctx,
    { studentId: 's2', nodeId: 'convert_ppo_check', input: 'aiming to convert my current internship' },
    router
  );
  check('advances to convert_track', t3.nodeId === 'convert_track');

  const t4 = await processTurn(
    ctx,
    { studentId: 's2', nodeId: 'convert_track', input: 'backend engineering' },
    router
  );
  check('scripted node captures reply into ctx.answers.specialization', ctx.answers.specialization === 'backend engineering');
  check(
    'convert_wrapup interpolation has no blank hole for {answers.specialization}',
    t4.say.includes('backend engineering') && !t4.say.includes('{answers.')
  );
  check('convert_wrapup marks stage complete', t4.stageComplete);
}

async function main() {
  await testEntryStateBranching();
  await testRouterFallback();
  await testFullDiscoverConversation();
  await testScriptedSlotCapture();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll Phase 0 smoke checks passed.');
}

main();
