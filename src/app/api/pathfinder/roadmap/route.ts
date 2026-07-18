import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/data/get-repository';
import { generateRoadmap } from '@/engine/roadmap';
import type { RoadmapItemRecord, RoadmapStatus } from '@/data/repository';

/** Depends on per-request studentId + mutable in-memory store; never prerender. */
export const dynamic = 'force-dynamic';

const VALID_STATUS: RoadmapStatus[] = ['suggested', 'saved', 'started', 'done'];

/** Fetch the student's roadmap, generating (once) from their year/program/answers
 * if none exists yet. Generate-once means saved statuses survive revisits. */
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

  let items = await repo.getRoadmapItems(studentId);
  if (items.length === 0) {
    const answerRows = await repo.getProfileAnswers(studentId);
    const answers = Object.fromEntries(answerRows.map((a) => [a.key, a.value]));
    const now = new Date().toISOString();
    items = generateRoadmap({ year: student.year, program: student.program, answers }).map(
      (spec): RoadmapItemRecord => ({
        studentId,
        itemId: spec.itemId,
        category: spec.category,
        title: spec.title,
        description: spec.description,
        link: spec.link,
        order: spec.order,
        status: 'suggested',
        createdAt: now,
      })
    );
    await repo.setRoadmapItems(studentId, items);
  }

  return NextResponse.json({ items });
}

/** Toggle one item's status (e.g. save/unsave, check off done). Accepts either
 * {status} directly or {done: boolean} as sugar for it. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    studentId?: string;
    itemId?: string;
    status?: string;
    done?: boolean;
  };
  // ponytail: un-done resets to 'suggested' -- check-off targets step-/sprint-
  // sub-steps, which never hold 'saved'/'started'; track prior status if that changes.
  const status =
    body.status ?? (typeof body.done === 'boolean' ? (body.done ? 'done' : 'suggested') : undefined);
  if (!body.studentId || !body.itemId || !status) {
    return NextResponse.json({ error: 'studentId, itemId, status (or done) are required' }, { status: 400 });
  }
  if (!VALID_STATUS.includes(status as RoadmapStatus)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const repo = getRepository();
  await repo.setRoadmapItemStatus(body.studentId, body.itemId, status as RoadmapStatus);
  return NextResponse.json({ ok: true });
}
