import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/data/get-repository';

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  const repo = getRepository();
  const student = await repo.getStudent(studentId);
  if (!student) {
    return NextResponse.json({ error: 'unknown student' }, { status: 404 });
  }

  const onboarding = await repo.getOnboardingState(studentId);
  const checkin = await repo.getCheckin(studentId);
  const conversationLog = await repo.getConversationLog(studentId);
  const onboardingComplete = onboarding?.stage === 'complete';
  const reengagementDue =
    onboardingComplete && !!checkin?.nextDueAt && new Date(checkin.nextDueAt) <= new Date();

  // Streak: consecutive UTC calendar days with >=1 conversation-log row,
  // counting back from today (no activity today -> 0). createdAt is an ISO
  // string, so its first 10 chars are the UTC date.
  const activeDays = new Set(conversationLog.map((e) => e.createdAt.slice(0, 10)));
  let streakDays = 0;
  const cursor = new Date();
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streakDays++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Degree-life checklist progress for the chat HUD pill: step-* (and the
  // sprint-*/stretch-* lanes that render alongside them) done vs total.
  const roadmapItems = await repo.getRoadmapItems(studentId);
  const stepItems = roadmapItems.filter(
    (i) => i.itemId.startsWith('step-') || i.itemId.startsWith('sprint-') || i.itemId.startsWith('stretch-')
  );
  const stepsDone = stepItems.filter((i) => i.status === 'done').length;

  return NextResponse.json({
    onboardingComplete,
    reengagementDue,
    year: student.year,
    hasHistory: conversationLog.length > 0,
    streakDays,
    stepsDone,
    stepsTotal: stepItems.length,
  });
}
