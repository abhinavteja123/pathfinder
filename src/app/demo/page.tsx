'use client';

import { useEffect, useState } from 'react';
import PathfinderChat from '@/ui/PathfinderChat';
import type { Program, Year } from '@/engine/types';

/**
 * Manual QA page for Phase 2 -- not part of the production integration
 * contract. Seeds a demo student via /api/pathfinder/seed (dev-only route)
 * then renders the chat gate standalone, since the real host portal isn't
 * available in this repo. Try /demo?year=3&program=BBA to see other personas.
 */
export default function DemoPage() {
  const [ready, setReady] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState<Year>(1);
  const [program, setProgram] = useState<Program>('BTech');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const y = (Number(params.get('year')) || 1) as Year;
    const p = (params.get('program') as Program) || 'BTech';
    const id = params.get('studentId') || `demo-y${y}-${p}`;
    setStudentId(id);
    setYear(y);
    setProgram(p);

    fetch('/api/pathfinder/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, year: y, program: p }),
    }).then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <main className="space-bg grid min-h-[100dvh] place-items-center">
        <p className="text-sm text-[var(--ink-dim)]">Waking up your companion…</p>
      </main>
    );
  }

  return <PathfinderChat studentId={studentId} year={year} program={program} />;
}
