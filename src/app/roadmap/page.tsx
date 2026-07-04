'use client';

import { useEffect, useMemo, useState } from 'react';
import RoadmapFlow from '@/ui/RoadmapFlow';
import type { RoadmapCategory, RoadmapItemRecord, RoadmapStatus } from '@/data/repository';
import type { Program, Year } from '@/engine/types';

const SHOWCASE: { category: RoadmapCategory; label: string }[] = [
  { category: 'hackathon', label: 'Hackathons' },
  { category: 'internship', label: 'Internships' },
  { category: 'oss', label: 'Open Source' },
];

/**
 * The saved-roadmap "profile" surface. Seeds the student first (the in-memory
 * store resets on server hot-reload) then fetches the roadmap, generating it on
 * the fly if onboarding hasn't persisted one. Saving is optimistic.
 */
export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItemRecord[]>([]);
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState<Year>(1);
  const [program, setProgram] = useState<Program>('BTech');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const y = (Number(params.get('year')) || 1) as Year;
    const p = (params.get('program') as Program) || 'BTech';
    const id = params.get('studentId') || `demo-y${y}-${p}`;
    setStudentId(id);
    setYear(y);
    setProgram(p);

    (async () => {
      await fetch('/api/pathfinder/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, year: y, program: p }),
      });
      const res = await fetch(`/api/pathfinder/roadmap?studentId=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = (await res.json()) as { items: RoadmapItemRecord[] };
        setItems(data.items);
      }
      setLoading(false);
    })();
  }, []);

  function toggleSave(itemId: string, nextStatus: RoadmapStatus) {
    const prev = items;
    setItems((list) => list.map((i) => (i.itemId === itemId ? { ...i, status: nextStatus } : i)));
    fetch('/api/pathfinder/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, itemId, status: nextStatus }),
    }).catch(() => setItems(prev)); // revert on failure
  }

  const byCategory = useMemo(() => {
    const map = new Map<RoadmapCategory, RoadmapItemRecord[]>();
    for (const it of items) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return map;
  }, [items]);

  return (
    <main className="space-bg starfield relative flex min-h-[100dvh] flex-col overflow-hidden">
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-sm font-bold text-black shadow-[0_0_20px_rgba(124,92,255,0.6)]">
            P
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Your Roadmap</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="glass hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--ink-dim)] sm:block">
            {program} · Year {year}
          </span>
          <a
            href={`/demo?year=${year}&program=${program}`}
            className="glass rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--ink)] transition-colors hover:text-[var(--cyan)]"
          >
            ← Back to chat
          </a>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-6 sm:px-8">
        <div className="glass animate-rise h-[60vh] min-h-[380px] overflow-hidden rounded-3xl">
          {loading ? (
            <div className="grid h-full place-items-center">
              <p className="text-sm text-[var(--ink-dim)]">Charting your path…</p>
            </div>
          ) : (
            <RoadmapFlow items={items} onToggleSave={toggleSave} />
          )}
        </div>

        {/* Explore showcase -- the "other modules" the bot points at */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SHOWCASE.map(({ category, label }) => {
            const list = byCategory.get(category) ?? [];
            return (
              <div key={category} className="glass rounded-2xl p-4">
                <p className="mb-2 font-display text-sm font-semibold text-[var(--ink)]">{label}</p>
                <ul className="flex flex-col gap-1.5">
                  {list.length === 0 && <li className="text-xs text-[var(--ink-dim)]">Coming soon.</li>}
                  {list.map((it) => (
                    <li key={it.itemId} className="text-xs">
                      {it.link ? (
                        <a
                          href={it.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--cyan)] hover:underline"
                        >
                          {it.title}
                          {it.status === 'saved' && <span className="ml-1 text-[var(--ink-dim)]">· saved</span>}
                        </a>
                      ) : (
                        <span className="text-[var(--ink)]">{it.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
