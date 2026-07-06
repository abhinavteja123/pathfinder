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
  const conversationLog = await repo.getConversationLog(studentId, 1);
  const onboardingComplete = onboarding?.stage === 'complete';
  const reengagementDue =
    onboardingComplete && !!checkin?.nextDueAt && new Date(checkin.nextDueAt) <= new Date();

  return NextResponse.json({
    onboardingComplete,
    reengagementDue,
    year: student.year,
    hasHistory: conversationLog.length > 0,
  });
}
