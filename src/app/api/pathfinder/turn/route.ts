import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/data/get-repository';
import { processTurn } from '@/engine/fsm';
import type { EngineContext, TurnRequest } from '@/engine/types';
import type { RoadmapItemRecord } from '@/data/repository';

const REENGAGEMENT_DAYS = 14;

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Short authored phrase a returning-student node can interpolate via
 * {roadmapProgress} so it opens progress-aware instead of a generic "welcome
 * back" -- the "bot remembers" moment, computed from stored roadmap item
 * statuses (not from any model). */
function buildRoadmapProgress(items: RoadmapItemRecord[]): string {
  const done = items.filter((i) => i.status === 'done').length;
  const started = items.filter((i) => i.status === 'started').length;
  const saved = items.filter((i) => i.status === 'saved').length;
  if (done > 0) return `I saw you marked ${done} roadmap item${done > 1 ? 's' : ''} done -- love that. `;
  if (started > 0) return `Looks like you started ${started} thing${started > 1 ? 's' : ''} from your roadmap. `;
  if (saved > 0) return `You've got ${saved} saved on your roadmap. `;
  return '';
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TurnRequest;
  if (!body.studentId || !body.nodeId) {
    return NextResponse.json({ error: 'studentId and nodeId are required' }, { status: 400 });
  }

  const repo = getRepository();
  const student = await repo.getStudent(body.studentId);
  if (!student) {
    return NextResponse.json({ error: 'unknown student' }, { status: 404 });
  }

  const answerRows = await repo.getProfileAnswers(body.studentId);
  const answers = Object.fromEntries(answerRows.map((a) => [a.key, a.value]));
  // ctx.answers is this same object by reference -- processTurn mutates it in
  // place, so snapshot the pre-turn values before diffing for persistence.
  // Values (not just keys): a re-captured key (e.g. domain re-pick on the
  // follow-up flow) must persist too -- addProfileAnswer appends a row and
  // reads collapse latest-wins per key.
  const preExisting = new Map(Object.entries(answers));
  const historyRows = await repo.getConversationLog(body.studentId, 10);
  const hasHistory = historyRows.length > 0;
  const roadmapItems = await repo.getRoadmapItems(body.studentId);

  // 14-day re-engagement: a returning student whose check-in has come due is
  // routed into the 5-question follow-up track (resolveEntryNode reads this off
  // the context). Same rule the status route reports to the client.
  const checkin = await repo.getCheckin(body.studentId);
  const reengagementDue = !!checkin?.nextDueAt && new Date(checkin.nextDueAt) <= new Date();
  // Snapshot onboarding BEFORE the turn: lets the completion block below tell a
  // real onboarding/follow-up wrap-up (should re-arm the 14-day clock) apart
  // from a casual not-due "welcome back" resume (must NOT push the clock out,
  // or a student who visits often would never become due for a follow-up).
  const priorOnboarding = await repo.getOnboardingState(body.studentId);

  const ctx: EngineContext = {
    studentId: body.studentId,
    year: student.year,
    program: student.program,
    hasHistory,
    reengagementDue,
    answers,
    roadmapProgress: buildRoadmapProgress(roadmapItems),
  };

  const response = processTurn(ctx, body);

  if (body.input !== undefined) {
    await repo.appendConversationLog({
      studentId: body.studentId,
      turn: historyRows.length,
      role: 'student',
      text: body.input,
      nodeId: body.nodeId,
      createdAt: new Date().toISOString(),
    });
  }
  await repo.appendConversationLog({
    studentId: body.studentId,
    turn: historyRows.length + 1,
    role: 'bot',
    text: response.say,
    nodeId: response.nodeId,
    createdAt: new Date().toISOString(),
  });

  for (const [key, value] of Object.entries(ctx.answers)) {
    if (preExisting.get(key) !== value) {
      await repo.addProfileAnswer({
        studentId: body.studentId,
        key,
        value,
        capturedAt: new Date().toISOString(),
      });
    }
  }

  if (response.stageComplete) {
    await repo.setOnboardingState({
      studentId: body.studentId,
      stage: 'complete',
      completedAt: new Date().toISOString(),
    });
    // Re-arm the 14-day check-in ONLY when this was a real onboarding (first
    // completion) or a due follow-up -- not when a returning, not-due student
    // just hit the brief "welcome back" resume (which is also terminal). Anchors
    // the cadence to actual check-ins, so casual visits can't defer the next one.
    const wasAlreadyComplete = priorOnboarding?.stage === 'complete';
    if (!wasAlreadyComplete || reengagementDue) {
      await repo.setCheckin({
        studentId: body.studentId,
        lastCheckinAt: new Date().toISOString(),
        nextDueAt: addDays(new Date(), REENGAGEMENT_DAYS).toISOString(),
      });
    }
  } else if (!priorOnboarding || priorOnboarding.stage === 'not_started') {
    await repo.setOnboardingState({
      studentId: body.studentId,
      stage: 'in_progress',
      startedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(response);
}
