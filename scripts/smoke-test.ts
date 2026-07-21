/**
 * Smoke test -- run with `npm run smoke`.
 * The bot is 100% rule-based now (no LLM): this exercises the JSON question-tree
 * loader + zod validation, the 3-way entry routing (new / due-follow-up /
 * not-due resume), and a full 10-question NEW walk plus a 5-question FOLLOW-UP
 * walk for every year, incl. branch-specific menus.
 */
import { resolveEntryNode } from '../src/engine/entry-state';
import { processTurn } from '../src/engine/fsm';
import { NODES } from '../src/engine/content-loader';
import { nodeSchema, validateTree } from '../src/engine/node-schema';
import { generateRoadmap } from '../src/engine/roadmap';
import type { EngineContext, FixedNode, TurnRequest, Year } from '../src/engine/types';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`PASS  ${label}`);
  else {
    console.error(`FAIL  ${label}`);
    failures++;
  }
}

function ctxFor(over: Partial<EngineContext>): EngineContext {
  return {
    studentId: 's',
    year: 1,
    program: 'BTech',
    hasHistory: false,
    reengagementDue: false,
    answers: {},
    ...over,
  };
}

/** Drive one turn; returns the response and leaves ctx.answers mutated. */
function turn(ctx: EngineContext, nodeId: string, input?: string) {
  const req: TurnRequest = { studentId: ctx.studentId, nodeId, input };
  return processTurn(ctx, req);
}

function testLoaderAndValidation() {
  check('content loader booted a non-empty node map', Object.keys(NODES).length > 40);

  const years: Year[] = [1, 2, 3, 4];
  const allEntriesExist = years.every(
    (y) =>
      !!NODES[resolveEntryNode(y, false, false)] &&
      !!NODES[resolveEntryNode(y, true, true)] &&
      !!NODES[resolveEntryNode(y, true, false)]
  );
  check('every entry node the router names exists in the tree', allEntriesExist);

  // zod rejects a malformed node (unknown field / missing say).
  const bad = nodeSchema.safeParse({ id: 'x', sayTypo: 'hi' });
  check('zod rejects a malformed node', !bad.success);

  // validateTree throws on a dangling edge.
  let threw = false;
  try {
    validateTree({
      a: { id: 'a', say: 'hi', options: [{ label: 'go', next: 'nowhere' }] } as FixedNode,
    });
  } catch {
    threw = true;
  }
  check('validateTree throws on a dangling next target', threw);
}

function testEntryRouting() {
  check(
    'Y1 3-way entry: new->intro, due->followup, not-due->continue',
    resolveEntryNode(1, false, false) === 'discover_intro' &&
      resolveEntryNode(1, true, true) === 'discover_followup_intro' &&
      resolveEntryNode(1, true, false) === 'discover_continue'
  );
  check(
    'Y2 3-way entry',
    resolveEntryNode(2, false, false) === 'build_intro' &&
      resolveEntryNode(2, true, true) === 'build_followup_intro' &&
      resolveEntryNode(2, true, false) === 'build_continue'
  );
  check(
    'Y3 3-way entry',
    resolveEntryNode(3, false, false) === 'convert_intro' &&
      resolveEntryNode(3, true, true) === 'convert_followup_intro' &&
      resolveEntryNode(3, true, false) === 'convert_continue'
  );
  check(
    'Y4 3-way entry',
    resolveEntryNode(4, false, false) === 'launch_intro' &&
      resolveEntryNode(4, true, true) === 'launch_followup_intro' &&
      resolveEntryNode(4, true, false) === 'launch_continue'
  );
}

function testY1NewWalk() {
  const ctx = ctxFor({ year: 1, answers: { branch: 'CSE' } });
  const t1 = turn(ctx, 'start');
  check('Y1 new lands on discover_intro, branch-aware', t1.nodeId === 'discover_intro' && t1.say.includes('CSE'));

  let r = turn(ctx, 'discover_intro', "Let's go");
  check('-> hobbies', r.nodeId === 'discover_hobbies');
  r = turn(ctx, 'discover_hobbies', 'gaming and football');
  check('-> goal, captured hobbies', r.nodeId === 'discover_goal' && ctx.answers.hobbies === 'gaming and football');
  r = turn(ctx, 'discover_goal', 'build my own startup');
  check('-> path, captured goal', r.nodeId === 'discover_path' && ctx.answers.goal === 'build my own startup');
  r = turn(ctx, 'discover_path', 'Solid job, good growth');
  check('-> package, captured career_path', r.nodeId === 'discover_package' && ctx.answers.career_path === 'Solid job, good growth');
  // Startup path skips the salary-package question -> founder-scale question instead.
  const founder = ctxFor({ year: 1, answers: { branch: 'CSE' } });
  turn(founder, 'discover_intro', "Let's go");
  const fp = turn(founder, 'discover_path', 'My own startup');
  check('startup path routes to founder-scale, not the LPA package question', fp.nodeId === 'discover_startup_scale' && !fp.say.includes('LPA'));
  r = turn(ctx, 'discover_package', 'Above 50 LPA');
  check('-> hardwork with 50+ real-talk', r.nodeId === 'discover_hardwork' && r.say.includes('top 1%'));
  r = turn(ctx, 'discover_hardwork', "I'm ready 💪");
  check('-> domain, CSE 8-option menu (no ECE/EEE)', r.nodeId === 'discover_domain' && (r.options?.length ?? 0) === 8 && !r.options?.some((o) => o.label === 'ECE'));
  r = turn(ctx, 'discover_domain', 'AI/ML');
  check('-> domain_q1, captured domain', r.nodeId === 'discover_domain_q1' && ctx.answers.domain === 'AI/ML');
  r = turn(ctx, 'discover_domain_q1', 'the maths behind it');
  check('-> time_budget', r.nodeId === 'discover_time_budget');
  r = turn(ctx, 'discover_time_budget', '8+ hrs/week');
  check('-> learn_style (revived), captured time_budget', r.nodeId === 'discover_learn_style' && ctx.answers.time_budget === '8+ hrs/week');
  r = turn(ctx, 'discover_learn_style', 'building hands-on');
  check('-> domain_confidence (revived)', r.nodeId === 'discover_domain_confidence');
  r = turn(ctx, 'discover_domain_confidence', 'all-in');
  check('-> roadmap_intro, CSE LeetCode + 50+ push', r.nodeId === 'discover_roadmap_intro' && r.say.includes('LeetCode') && r.say.includes('top-company bar'));
  r = turn(ctx, 'discover_roadmap_intro', 'Show me 🚀');
  check('-> transition', r.nodeId === 'discover_transition');
  r = turn(ctx, 'discover_transition', "Let's go");
  check('-> wrapup terminal, interpolated + no braces', r.nodeId === 'discover_wrapup' && r.stageComplete && r.say.includes('AI/ML') && !r.say.includes('{'));

  // ECE branch swaps the domain menu.
  const ece = ctxFor({ year: 1, answers: { branch: 'ECE' } });
  const e = turn(ece, 'discover_hardwork', 'Show me how');
  check(
    'ECE gets the VLSI menu, not AI/ML',
    e.nodeId === 'discover_domain' && !!e.options?.some((o) => o.label === 'VLSI Design') && !e.options?.some((o) => o.label === 'AI/ML')
  );
}

function testY1FollowupWalk() {
  const ctx = ctxFor({ year: 1, hasHistory: true, reengagementDue: true, answers: { branch: 'CSE', domain: 'AI/ML', goal: 'build AI products' } });
  const t1 = turn(ctx, 'start');
  check('Y1 due -> discover_followup_intro with wave', t1.nodeId === 'discover_followup_intro' && t1.gesture === 'wave');
  let r = turn(ctx, 'discover_followup_intro', 'tried some Kaggle');
  check('-> practice, captured checkin_note', r.nodeId === 'discover_checkin_practice' && ctx.answers.checkin_note === 'tried some Kaggle');
  r = turn(ctx, 'discover_checkin_practice', 'on and off');
  check('-> steps', r.nodeId === 'discover_checkin_steps');
  r = turn(ctx, 'discover_checkin_steps', 'none yet');
  check('-> quiz, AI/ML question + 3-option menu', r.nodeId === 'discover_checkin_quiz' && r.say.includes('labeled examples') && (r.options?.length ?? 0) === 3);
  r = turn(ctx, 'discover_checkin_quiz', 'supervised learning');
  check('-> grade, praise line', r.nodeId === 'discover_checkin_quiz_grade' && r.say.includes('Nailed it'));
  r = turn(ctx, 'discover_checkin_quiz_grade', 'Got it');
  check('-> retest replays domain + goal', r.nodeId === 'discover_checkin_retest' && r.say.includes('AI/ML') && r.say.includes('build AI products'));
  r = turn(ctx, 'discover_checkin_retest', 'still the same');
  check('-> return wrapup terminal, toned', r.nodeId === 'discover_return_wrapup' && r.stageComplete && r.say.includes('Consistency beats intensity'));

  // not-due returning -> brief continue (terminal, one message).
  const cont = ctxFor({ year: 1, hasHistory: true, reengagementDue: false, answers: { branch: 'CSE', domain: 'AI/ML' } });
  const c = turn(cont, 'start');
  check('Y1 not-due -> brief discover_continue terminal', c.nodeId === 'discover_continue' && c.stageComplete);
}

function testY2NewWalk() {
  const ctx = ctxFor({ year: 2, answers: { branch: 'CSE' } });
  check('Y2 new -> build_intro', turn(ctx, 'start').nodeId === 'build_intro');
  let r = turn(ctx, 'build_intro', "Let's go");
  check('-> build_goal', r.nodeId === 'build_goal');
  r = turn(ctx, 'build_goal', 'backend engineer');
  check('-> build_domain, captured goal', r.nodeId === 'build_domain' && ctx.answers.goal === 'backend engineer');
  r = turn(ctx, 'build_domain', 'Web Dev');
  check('-> skill_check multiSelect, captured domain', r.nodeId === 'build_skill_check' && r.multiSelect === true && ctx.answers.domain === 'Web Dev');
  r = turn(ctx, 'build_skill_check', 'Git, SQL');
  check('-> project_count, multi captured whole', r.nodeId === 'build_project_count' && ctx.answers.skills_have === 'Git, SQL');
  r = turn(ctx, 'build_project_count', '4+');
  r = turn(ctx, 'build_dsa_status', 'daily-ish');
  check('-> activity_check', r.nodeId === 'build_activity_check');
  r = turn(ctx, 'build_activity_check', 'a hackathon chat app');
  r = turn(ctx, 'build_internship_intent', 'yes');
  check('-> time_budget', r.nodeId === 'build_time_budget');
  r = turn(ctx, 'build_time_budget', '3–7 hrs/week');
  r = turn(ctx, 'build_learn_style', 'building hands-on');
  check('-> blocker', r.nodeId === 'build_blocker');
  r = turn(ctx, 'build_blocker', 'time');
  check('-> wrapup terminal, momentumBand resolved', r.nodeId === 'build_wrapup' && r.stageComplete && r.say.includes('building real momentum') && !r.say.includes('{'));
}

function testY3NewWalk() {
  const ctx = ctxFor({ year: 3, answers: { branch: 'CSE' } });
  check('Y3 new -> convert_intro', turn(ctx, 'start').nodeId === 'convert_intro');
  let r = turn(ctx, 'convert_intro', "Let's go");
  r = turn(ctx, 'convert_goal', 'SDE at a product company');
  check('-> convert_track, captured goal', r.nodeId === 'convert_track' && ctx.answers.goal === 'SDE at a product company');
  r = turn(ctx, 'convert_track', 'AI/ML');
  check('-> ppo_check, captured domain (menu now, feeds roadmap catalog)', r.nodeId === 'convert_ppo_check' && ctx.answers.domain === 'AI/ML');
  r = turn(ctx, 'convert_ppo_check', 'converting my internship');
  check('-> skillgap multiSelect', r.nodeId === 'convert_skillgap_grid' && r.multiSelect === true);
  r = turn(ctx, 'convert_skillgap_grid', 'DSA in one language, SQL + databases');
  check('-> readiness, captured skillgap', r.nodeId === 'convert_readiness_rate' && ctx.answers.skillgap === 'DSA in one language, SQL + databases');
  r = turn(ctx, 'convert_readiness_rate', 'strong');
  r = turn(ctx, 'convert_resume_status', 'recruiter-ready');
  r = turn(ctx, 'convert_referral_net', 'a few');
  r = turn(ctx, 'convert_target_type', 'product cos');
  check('-> time_budget, captured target_type', r.nodeId === 'convert_time_budget' && ctx.answers.target_type === 'product cos');
  r = turn(ctx, 'convert_time_budget', '8+ hrs/week');
  r = turn(ctx, 'convert_ppo_intent', 'both');
  check('-> wrapup terminal, readinessBand on-track + domain', r.nodeId === 'convert_wrapup' && r.stageComplete && r.say.includes('on track') && r.say.includes('AI/ML') && !r.say.includes('{'));
}

function testY4NewWalk() {
  const ctx = ctxFor({ year: 4, answers: { branch: 'CSE' } });
  check('Y4 new -> launch_intro', turn(ctx, 'start').nodeId === 'launch_intro');
  let r = turn(ctx, 'launch_intro', "Let's go");
  r = turn(ctx, 'launch_goal', 'product company SDE');
  check('-> offer_check, captured goal', r.nodeId === 'launch_offer_check' && ctx.answers.goal === 'product company SDE');
  r = turn(ctx, 'launch_offer_check', 'two rounds pending');
  check('-> days_left, captured offer_status', r.nodeId === 'launch_days_left' && ctx.answers.offer_status === 'two rounds pending');
  r = turn(ctx, 'launch_days_left', '<2wk');
  r = turn(ctx, 'launch_weakest_round', 'DSA');
  r = turn(ctx, 'launch_offer_band', '0');
  check('-> backup_plan sprint-mode tone', r.nodeId === 'launch_backup_plan' && r.say.includes('sprint mode'));
  r = turn(ctx, 'launch_backup_plan', 'off-campus');
  r = turn(ctx, 'launch_mock_status', '1–2');
  check('-> target_type', r.nodeId === 'launch_target_type');
  r = turn(ctx, 'launch_target_type', 'product cos');
  r = turn(ctx, 'launch_time_budget', '8+ hrs/week');
  check('-> higher_studies', r.nodeId === 'launch_higher_studies');
  r = turn(ctx, 'launch_higher_studies', 'placements only');
  check('-> wrapup terminal, interpolated', r.nodeId === 'launch_wrapup' && r.stageComplete && r.say.includes('product company SDE') && !r.say.includes('{'));
}

function testCrashSprintRoadmap() {
  const sprint = generateRoadmap({
    year: 4,
    program: 'BTech',
    answers: { days_left: '<2wk', weakest_round: 'DSA', target_type: 'product cos' },
  }).filter((i) => i.itemId.startsWith('sprint-'));
  const withoutDaysLeft = generateRoadmap({ year: 4, program: 'BTech', answers: {} });
  check(
    'Y4 <2wk crash sprint = 4 day-keyed items incl. NeetCode; none without days_left',
    sprint.length === 4 &&
      sprint.every((i) => i.title.startsWith('Day ') && i.order >= 900) &&
      sprint.some((i) => i.link === 'https://neetcode.io/practice') &&
      withoutDaysLeft.every((i) => !i.itemId.startsWith('sprint-'))
  );

  // Branch content: a core-branch (Civil) roadmap must NOT carry the CSE-coding
  // "Good First Issue" open-source card; CSE keeps it.
  const civil = generateRoadmap({ year: 2, program: 'BTech', answers: { branch: 'Civil', domain: 'Structural Design' } });
  const cse = generateRoadmap({ year: 2, program: 'BTech', answers: { branch: 'CSE', domain: 'AI/ML' } });
  check(
    'Civil roadmap drops the GitHub/OSS card + carries Civil steps; CSE keeps OSS',
    !civil.some((i) => i.itemId === 'oss-gfi') &&
      civil.some((i) => i.title.includes('AutoCAD')) &&
      !civil.some((i) => i.title.includes('LeetCode')) &&
      cse.some((i) => i.itemId === 'oss-gfi')
  );

  // BBA (a program, no branch) must get business steps -- NO GitHub/LeetCode/DSA
  // leaking in from the coding STEP_GUIDE fallback.
  const bba = generateRoadmap({ year: 2, program: 'BBA', answers: { domain: 'Marketing' } });
  const bbaText = bba.map((i) => `${i.title} ${i.description}`).join(' ');
  check(
    'BBA roadmap has business steps (LinkedIn) and no GitHub/LeetCode/DSA leak',
    /LinkedIn/.test(bbaText) && !/GitHub|LeetCode|DSA/.test(bbaText) && !bba.some((i) => i.itemId === 'oss-gfi')
  );
}

function main() {
  testLoaderAndValidation();
  testEntryRouting();
  testY1NewWalk();
  testY1FollowupWalk();
  testY2NewWalk();
  testY3NewWalk();
  testY4NewWalk();
  testCrashSprintRoadmap();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll rule-based smoke checks passed.');
}

main();
