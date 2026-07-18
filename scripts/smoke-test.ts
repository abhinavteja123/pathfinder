/**
 * Phase 0 smoke test -- run with `npm run smoke`.
 * Exercises: entry-state branching, LLM router fallback chain (no network
 * required unless GROQ_API_KEY/GEMINI_API_KEY are set), repository roundtrip,
 * and a full Y1 Discover conversation reaching stageComplete.
 */
import { resolveEntryNode } from '../src/engine/entry-state';
import { processTurn } from '../src/engine/fsm';
import { LlmRouter, type LlmProvider } from '../src/engine/llm-router';
import { generateRoadmap } from '../src/engine/roadmap';
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
  check(
    'Y1 enters discover_intro fresh, discover_continue returning',
    resolveEntryNode(1, false) === 'discover_intro' && resolveEntryNode(1, true) === 'discover_continue'
  );
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

  // Branch is seeded at login (the "fetch student details" step of the flow
  // chart) -- it's already in answers before the first turn, never asked.
  const ctx: EngineContext = {
    studentId: 's1',
    year: 1,
    program: 'BTech',
    hasHistory: false,
    answers: { branch: 'CSE' },
    history: [],
  };

  const t1 = await processTurn(ctx, { studentId: 's1', nodeId: 'start' }, router);
  check('turn 1 lands on discover_intro', t1.nodeId === 'discover_intro');
  check('intro greeting is branch-aware (mentions CSE)', t1.say.includes('CSE'));

  const t2 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_intro', input: "Let's go" }, router);
  check('turn 2 advances to discover_hobbies', t2.nodeId === 'discover_hobbies');

  const t3 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_hobbies', input: 'reading and gaming' }, router);
  check(
    'turn 3 advances to discover_goal and captures hobbies',
    t3.nodeId === 'discover_goal' && ctx.answers.hobbies === 'reading and gaming'
  );

  const t4 = await processTurn(
    ctx,
    { studentId: 's1', nodeId: 'discover_goal', input: 'I want to build my own product' },
    router
  );
  check(
    'turn 4 advances to discover_path and captures goal',
    t4.nodeId === 'discover_path' && ctx.answers.goal === 'I want to build my own product'
  );

  const t5 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_path', input: 'My own startup' }, router);
  check(
    'turn 5 advances to discover_package and captures career_path',
    t5.nodeId === 'discover_package' && ctx.answers.career_path === 'My own startup'
  );

  const t6 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_package', input: 'Above 50 LPA' }, router);
  check(
    'turn 6 advances to discover_hardwork with the above-50 real-talk line',
    t6.nodeId === 'discover_hardwork' && ctx.answers.package_goal === 'Above 50 LPA' && t6.say.includes('top 1%')
  );

  const t7 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_hardwork', input: "I'm ready 💪" }, router);
  check('turn 7 advances to discover_domain', t7.nodeId === 'discover_domain');
  check(
    'CSE branch keeps the default 10-domain menu',
    (t7.options?.length ?? 0) === 10 && !!t7.options?.some((o) => o.label === 'AI/ML')
  );

  const t8 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_domain', input: 'AI/ML' }, router);
  check(
    'turn 8 advances to discover_domain_q1 and captures domain',
    t8.nodeId === 'discover_domain_q1' && ctx.answers.domain === 'AI/ML'
  );

  const t9 = await processTurn(
    ctx,
    { studentId: 's1', nodeId: 'discover_domain_q1', input: 'love the math behind it' },
    router
  );
  check('turn 9 advances to discover_roadmap_intro', t9.nodeId === 'discover_roadmap_intro');
  check('roadmap intro is branch-toned (CSE mentions LeetCode)', t9.say.includes('LeetCode'));

  const t10 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_roadmap_intro', input: 'Show me 🚀' }, router);
  check('turn 10 advances to discover_transition', t10.nodeId === 'discover_transition');

  const t11 = await processTurn(ctx, { studentId: 's1', nodeId: 'discover_transition', input: "Let's go" }, router);
  check('turn 11 reaches discover_wrapup and marks stage complete', t11.nodeId === 'discover_wrapup' && t11.stageComplete);
  check(
    'discover_wrapup interpolates {answers.domain} and promises memory',
    t11.say.includes('AI/ML') && !t11.say.includes('{answers.') && t11.say.includes('remember')
  );

  // Non-CSE branch: same spine, branch-specific domain menu + VLSI-certs tone.
  const ctxEce: EngineContext = {
    studentId: 's2',
    year: 1,
    program: 'BTech',
    hasHistory: false,
    answers: { branch: 'ECE' },
    history: [],
  };
  const e1 = await processTurn(ctxEce, { studentId: 's2', nodeId: 'start' }, router);
  check('ECE intro greeting is branch-aware', e1.say.includes('ECE'));
  const e2 = await processTurn(ctxEce, { studentId: 's2', nodeId: 'discover_hardwork', input: 'Show me how' }, router);
  check(
    'ECE branch gets the VLSI/Embedded domain menu, not the CSE list',
    e2.nodeId === 'discover_domain' &&
      !!e2.options?.some((o) => o.label === 'VLSI Design') &&
      !e2.options?.some((o) => o.label === 'AI/ML')
  );
  const e3 = await processTurn(ctxEce, { studentId: 's2', nodeId: 'discover_domain', input: 'VLSI Design' }, router);
  check('ECE domain follow-up has a canned VLSI question', e3.nodeId === 'discover_domain_q1' && e3.say.includes('chips'));
  const e4 = await processTurn(ctxEce, { studentId: 's2', nodeId: 'discover_domain_q1', input: 'designing chips' }, router);
  check('ECE roadmap intro mentions VLSI certifications + college courses', e4.say.includes('VLSI') && e4.say.includes('college courses'));
}

// Y2 Build: the only multi-select node (build_skill_check) plus the
// {momentumBand} computed string on build_wrapup.
async function testMultiSelectAndMomentumBand() {
  const router = new LlmRouter({ scriptedFallback: () => 'Noted!' });

  const ctx: EngineContext = {
    studentId: 's3',
    year: 2,
    program: 'BTech',
    hasHistory: true,
    answers: { goal: 'land a backend internship' },
    history: [],
  };

  const t1 = await processTurn(ctx, { studentId: 's3', nodeId: 'start' }, router);
  check('Y2 with history enters build_continue', t1.nodeId === 'build_continue');

  const t2 = await processTurn(ctx, { studentId: 's3', nodeId: 'build_continue' }, router);
  check('advances to build_activity_check', t2.nodeId === 'build_activity_check');

  const t3 = await processTurn(
    ctx,
    { studentId: 's3', nodeId: 'build_activity_check', input: 'built a chat app at a hackathon' },
    router
  );
  check(
    'build_skill_check arrives flagged multiSelect:true',
    t3.nodeId === 'build_skill_check' && t3.multiSelect === true
  );

  const t4 = await processTurn(ctx, { studentId: 's3', nodeId: 'build_skill_check', input: 'Git, SQL' }, router);
  check(
    'multi node captures comma-joined input whole into skills_have and advances via next',
    ctx.answers.skills_have === 'Git, SQL' && t4.nodeId === 'build_project_count'
  );

  const t5 = await processTurn(ctx, { studentId: 's3', nodeId: 'build_project_count', input: '4+' }, router);
  const t6 = await processTurn(ctx, { studentId: 's3', nodeId: 'build_dsa_status', input: 'daily-ish' }, router);
  const t7 = await processTurn(ctx, { studentId: 's3', nodeId: 'build_internship_intent', input: 'yes' }, router);
  check(
    'build chain runs project_count -> dsa_status -> internship_intent -> blocker',
    t5.nodeId === 'build_dsa_status' && t6.nodeId === 'build_internship_intent' && t7.nodeId === 'build_blocker'
  );

  const t8 = await processTurn(ctx, { studentId: 's3', nodeId: 'build_blocker', input: 'time' }, router);
  check(
    'build_wrapup resolves {momentumBand} with no literal brace',
    t8.nodeId === 'build_wrapup' &&
      t8.stageComplete &&
      t8.say.includes('building real momentum') &&
      !t8.say.includes('{')
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
  check(
    'convert_skillgap_grid arrives flagged multiSelect:true',
    t3.nodeId === 'convert_skillgap_grid' && t3.multiSelect === true
  );

  const t4 = await processTurn(
    ctx,
    { studentId: 's2', nodeId: 'convert_skillgap_grid', input: 'Git + code review flow, SQL + databases' },
    router
  );
  check(
    'skillgap multi node captures comma-joined labels whole and advances via next',
    ctx.answers.skillgap === 'Git + code review flow, SQL + databases' && t4.nodeId === 'convert_readiness_rate'
  );

  const t5 = await processTurn(ctx, { studentId: 's2', nodeId: 'convert_readiness_rate', input: 'strong' }, router);
  const t6 = await processTurn(ctx, { studentId: 's2', nodeId: 'convert_resume_status', input: 'recruiter-ready' }, router);
  const t7 = await processTurn(ctx, { studentId: 's2', nodeId: 'convert_referral_net', input: 'a few' }, router);
  const t8 = await processTurn(ctx, { studentId: 's2', nodeId: 'convert_target_type', input: 'product cos' }, router);
  check(
    'convert chain runs readiness_rate -> resume_status -> referral_net -> target_type -> track',
    t5.nodeId === 'convert_resume_status' &&
      t6.nodeId === 'convert_referral_net' &&
      t7.nodeId === 'convert_target_type' &&
      t8.nodeId === 'convert_track'
  );
  check(
    'readiness keys captured (readiness_dsa / resume_status / referral_status / target_type)',
    ctx.answers.readiness_dsa === 'strong' &&
      ctx.answers.resume_status === 'recruiter-ready' &&
      ctx.answers.referral_status === 'a few' &&
      ctx.answers.target_type === 'product cos'
  );

  const t9 = await processTurn(
    ctx,
    { studentId: 's2', nodeId: 'convert_track', input: 'backend engineering' },
    router
  );
  check('scripted node captures reply into ctx.answers.specialization', ctx.answers.specialization === 'backend engineering');
  check(
    'convert_wrapup narrates {readinessBand} verdict (strong + recruiter-ready => on track)',
    t9.say.includes('on track')
  );
  check(
    'convert_wrapup say fully resolved -- no literal { brace remains (bands + answers)',
    t9.say.includes('backend engineering') && !t9.say.includes('{')
  );
  check('convert_wrapup marks stage complete', t9.stageComplete);
}

// Y4 Launch: the 5-node sprint intake between launch_offer_check and
// launch_higher_studies, incl. the offer_count tone branch on launch_backup_plan.
async function testLaunchSprintWalk() {
  const router = new LlmRouter({ scriptedFallback: () => 'Noted!' });

  const ctx: EngineContext = {
    studentId: 's4',
    year: 4,
    program: 'BTech',
    hasHistory: true,
    answers: { goal: 'a backend role at a product company', conversion_plan: 'PPO talks at my internship' },
    history: [],
  };

  const t1 = await processTurn(ctx, { studentId: 's4', nodeId: 'start' }, router);
  check('Y4 with history enters launch_continue', t1.nodeId === 'launch_continue');

  const t2 = await processTurn(ctx, { studentId: 's4', nodeId: 'launch_continue' }, router);
  check('advances to launch_offer_check', t2.nodeId === 'launch_offer_check');

  const t3 = await processTurn(
    ctx,
    { studentId: 's4', nodeId: 'launch_offer_check', input: 'two final rounds pending' },
    router
  );
  check('advances to launch_days_left', t3.nodeId === 'launch_days_left');

  const t4 = await processTurn(ctx, { studentId: 's4', nodeId: 'launch_days_left', input: '<2wk' }, router);
  check(
    'captures days_left and advances to launch_weakest_round',
    ctx.answers.days_left === '<2wk' && t4.nodeId === 'launch_weakest_round'
  );

  const t5 = await processTurn(ctx, { studentId: 's4', nodeId: 'launch_weakest_round', input: 'DSA' }, router);
  check(
    'captures weakest_round and advances to launch_offer_band',
    ctx.answers.weakest_round === 'DSA' && t5.nodeId === 'launch_offer_band'
  );

  const t6 = await processTurn(ctx, { studentId: 's4', nodeId: 'launch_offer_band', input: '0' }, router);
  check(
    'offer_count 0 lands on launch_backup_plan in sprint-mode tone',
    ctx.answers.offer_count === '0' && t6.nodeId === 'launch_backup_plan' && t6.say.includes('sprint mode')
  );

  const t7 = await processTurn(ctx, { studentId: 's4', nodeId: 'launch_backup_plan', input: 'off-campus' }, router);
  const t8 = await processTurn(ctx, { studentId: 's4', nodeId: 'launch_mock_status', input: '1–2' }, router);
  check(
    'sprint chain runs backup_plan -> mock_status -> higher_studies with captures',
    t7.nodeId === 'launch_mock_status' &&
      t8.nodeId === 'launch_higher_studies' &&
      ctx.answers.backup_plan === 'off-campus' &&
      ctx.answers.mock_status === '1–2'
  );

  const t9 = await processTurn(
    ctx,
    { studentId: 's4', nodeId: 'launch_higher_studies', input: 'placements only' },
    router
  );
  check('launch_wrapup reached and marks stage complete', t9.nodeId === 'launch_wrapup' && t9.stageComplete);
  check(
    'launch_wrapup say fully resolved -- no literal { brace remains',
    t9.say.includes('a backend role at a product company') && !t9.say.includes('{')
  );
}

// Y4 crash-sprint roadmap track (roadmap.ts buildSprintItems).
function testCrashSprintRoadmap() {
  const sprint = generateRoadmap({
    year: 4,
    program: 'BTech',
    answers: { days_left: '<2wk', weakest_round: 'DSA', target_type: 'product cos' },
  }).filter((i) => i.itemId.startsWith('sprint-'));
  const withoutDaysLeft = generateRoadmap({ year: 4, program: 'BTech', answers: {} });
  check(
    'Y4 <2wk crash sprint emits 4 day-keyed milestone items incl. a NeetCode link; none without days_left',
    sprint.length === 4 &&
      sprint.every((i) => i.title.startsWith('Day ') && i.category === 'milestone' && i.order >= 900) &&
      sprint.some((i) => i.link === 'https://neetcode.io/practice') &&
      withoutDaysLeft.every((i) => !i.itemId.startsWith('sprint-'))
  );
}

async function main() {
  await testEntryStateBranching();
  testCrashSprintRoadmap();
  await testRouterFallback();
  await testFullDiscoverConversation();
  await testMultiSelectAndMomentumBand();
  await testScriptedSlotCapture();
  await testLaunchSprintWalk();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll Phase 0 smoke checks passed.');
}

main();
