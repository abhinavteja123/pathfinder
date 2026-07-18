import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/data/get-repository';
import type { Program, Year } from '@/engine/types';

/**
 * Dev/demo-only helper: production creates students via the host portal's own
 * signup flow (out of scope here). This exists purely so /demo can seed a
 * student without a real portal attached.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    studentId: string;
    year: Year;
    program: Program;
    /** Engineering branch (CSE/ECE/Civil/EEE/Mechanical) -- the "student
     * details" fetched at login. Stored as the `branch` profile answer so the
     * FSM can greet/menu per branch without ever asking for it in chat. */
    branch?: string;
  };
  if (!body.studentId || !body.year || !body.program) {
    return NextResponse.json({ error: 'studentId, year, program are required' }, { status: 400 });
  }

  const repo = getRepository();
  const existing = await repo.getStudent(body.studentId);
  if (!existing) {
    await repo.upsertStudent({
      id: body.studentId,
      year: body.year,
      program: body.program,
      createdAt: new Date().toISOString(),
    });
    if (body.branch) {
      await repo.addProfileAnswer({
        studentId: body.studentId,
        key: 'branch',
        value: body.branch,
        capturedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
