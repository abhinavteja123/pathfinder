import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/data/get-repository';
import type { Program, Year } from '@/engine/types';

/**
 * Dev/demo-only helper: production creates students via the host portal's own
 * signup flow (out of scope here). This exists purely so /demo can seed a
 * student without a real portal attached.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { studentId: string; year: Year; program: Program };
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
  }

  return NextResponse.json({ ok: true });
}
