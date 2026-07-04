import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/data/get-repository';
import { createDefaultRouter } from '@/engine/llm-router';
import { processTurn } from '@/engine/fsm';
import type { EngineContext, TurnRequest } from '@/engine/types';

const router = createDefaultRouter();
const REENGAGEMENT_DAYS = 14;

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
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
  // place, so snapshot which keys pre-existed before diffing for persistence.
  const preExistingKeys = new Set(Object.keys(answers));
  const historyRows = await repo.getConversationLog(body.studentId, 10);
  const history = historyRows.map((h) => ({
    role: (h.role === 'bot' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: h.text,
  }));
  const hasHistory = historyRows.length > 0;

  const ctx: EngineContext = {
    studentId: body.studentId,
    year: student.year,
    program: student.program,
    hasHistory,
    answers,
    history,
  };

  const response = await processTurn(ctx, body, router);

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
    if (!preExistingKeys.has(key)) {
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
    await repo.setCheckin({
      studentId: body.studentId,
      lastCheckinAt: new Date().toISOString(),
      nextDueAt: addDays(new Date(), REENGAGEMENT_DAYS).toISOString(),
    });
  } else {
    const existing = await repo.getOnboardingState(body.studentId);
    if (!existing || existing.stage === 'not_started') {
      await repo.setOnboardingState({
        studentId: body.studentId,
        stage: 'in_progress',
        startedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json(response);
}
