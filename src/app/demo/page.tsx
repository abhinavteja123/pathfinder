'use client';

import { useCallback, useEffect, useState } from 'react';
import PathfinderChat from '@/ui/PathfinderChat';
import CyberIntro from '@/ui/CyberIntro';
import type { Program, Year } from '@/engine/types';

/**
 * Manual QA page for Phase 2 -- not part of the production integration
 * contract. Seeds a demo student via /api/pathfinder/seed (dev-only route)
 * then renders the chat gate standalone, since the real host portal isn't
 * available in this repo. Try /demo?year=3&program=BBA to see other personas.
 *
 * No separate pre-chat tour screen -- the GitHub/LinkedIn/Internshala
 * explainer beats are interleaved INTO the conversation itself (see
 * PathfinderChat's `isFirstTime` handling), not shown upfront. This page just
 * tells PathfinderChat whether the student has prior history (via
 * /api/pathfinder/status) so returning students aren't interrupted with
 * explainers they've already seen.
 */
export default function DemoPage() {
  const [ready, setReady] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState<Year>(1);
  const [program, setProgram] = useState<Program>('BTech');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const y = (Number(params.get('year')) || 1) as Year;
    const p = (params.get('program') as Program) || 'BTech';
    // Branch = the "student details" fetched at login (flow chart). BTech
    // defaults to CSE when the picker didn't specify; BBA has no branch.
    const b = params.get('branch') || (p === 'BTech' ? 'CSE' : undefined);
    const id = params.get('studentId') || `demo-y${y}-${p}-${Date.now()}`;
    setStudentId(id);
    setYear(y);
    setProgram(p);

    // No explicit studentId (freshly generated demo id) or the picker's
    // fresh=1 hint => first-time student: start the cyber intro optimistically
    // so it doubles as the loading screen while seed/status resolve underneath.
    if (!params.get('studentId') || params.get('fresh') === '1') setShowIntro(true);

    fetch('/api/pathfinder/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, year: y, program: p, branch: b }),
    })
      .then(() => fetch(`/api/pathfinder/status?studentId=${encodeURIComponent(id)}`))
      .then((r) => (r.ok ? r.json() : { hasHistory: true }))
      .then((s: { hasHistory: boolean; streakDays?: number }) => {
        const first = !s.hasHistory;
        setIsFirstTime(first);
        setStreakDays(s.streakDays ?? 0);
        if (first) setShowIntro(true);
      })
      .catch(() => setIsFirstTime(false))
      .finally(() => setReady(true));
  }, []);

  const handleIntroDone = useCallback(() => setIntroDone(true), []);

  // Intro doubles as loader; if status resolves to a returning student while
  // it's up, `skip` fades it out immediately. Chat mounts only once BOTH
  // ready and the intro's onDone have fired.
  if (showIntro && !introDone) {
    return (
      <CyberIntro
        year={year}
        program={program}
        skip={ready && !isFirstTime}
        onDone={handleIntroDone}
      />
    );
  }

  if (!ready) {
    return (
      <main className="space-bg grid min-h-[100dvh] place-items-center">
        <p className="text-sm text-[var(--ink-dim)]">Waking up your companion…</p>
      </main>
    );
  }

  return <PathfinderChat studentId={studentId} year={year} program={program} isFirstTime={isFirstTime} streakDays={streakDays} />;
}
