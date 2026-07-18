'use client';

import { useState } from 'react';
import type { Program, Year } from '@/engine/types';

/**
 * Standalone demo picker -- side dummy for testing Pathfinder's 4 year-stage
 * personas interactively before a real host portal exists. Not part of the
 * Phase 3 gate-integration contract; just a discoverable front door onto
 * /demo?year=&program=&studentId= so every stage is reachable by click
 * instead of hand-typed URLs. Reskinned to the dark "Orbit" observation-deck
 * theme so it no longer clashes with the /demo gate (single-theme dark lock).
 */
const STAGES: { year: Year; name: string; blurb: string }[] = [
  { year: 1, name: 'Discover', blurb: 'Goals and interests. Casual, exploratory.' },
  { year: 2, name: 'Build', blurb: 'Skill audit and first applications.' },
  { year: 3, name: 'Convert', blurb: 'Internship to PPO, specialization.' },
  { year: 4, name: 'Launch', blurb: 'Placements, offers, higher studies.' },
];

const BRANCHES = ['CSE', 'ECE', 'Civil', 'EEE', 'Mechanical'] as const;
type Branch = (typeof BRANCHES)[number];

export default function Home() {
  const [program, setProgram] = useState<Program>('BTech');
  const [branch, setBranch] = useState<Branch>('CSE');

  const launch = (year: Year, fresh: boolean) => {
    // Fresh id (Date.now suffix) always hits the catch-up/intro entry node;
    // stable id lets a second visit hit the "continue" entry node.
    const studentId = fresh ? `demo-y${year}-${program}-${Date.now()}` : `demo-y${year}-${program}`;
    // Branch rides along as the login-fetched "student details" (flow chart)
    // -- BTech only; BBA has no engineering branch.
    const branchParam = program === 'BTech' ? `&branch=${branch}` : '';
    // fresh=1 lets /demo start the cyber intro immediately (it doubles as the
    // loader) instead of waiting for the status fetch to prove first-time.
    window.location.href = `/demo?year=${year}&program=${program}&studentId=${studentId}${branchParam}${fresh ? '&fresh=1' : ''}`;
  };

  return (
    <main className="space-bg starfield relative min-h-[100dvh] overflow-hidden">
      {/* ambient depth: soft floating glow pools behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(124,92,255,0.35),_transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(56,225,255,0.25),_transparent_70%)] blur-3xl"
      />

      {/* top bar -- matches the /demo and /roadmap headers */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-sm font-bold text-black shadow-[0_0_20px_rgba(124,92,255,0.6)]">
            P
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Pathfinder</span>
        </div>
        <span className="glass hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--ink-dim)] sm:block">
          Demo picker
        </span>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20 pt-6 sm:pt-10">
        <div className="animate-rise max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Meet your companion
          </h1>
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-[var(--ink-dim)] sm:text-[15px]">
            A standalone front door for testing the chatbot. No host portal is wired up yet
            (Phase 3, still pending), so each card launches the chat gate directly for one
            year-stage persona.
          </p>
        </div>

        {/* program segmented toggle */}
        <div
          className="animate-rise mt-7 inline-flex gap-1 rounded-full p-1 glass"
          style={{ animationDelay: '60ms' }}
          role="group"
          aria-label="Program"
        >
          {(['BTech', 'BBA'] as Program[]).map((p) => {
            const active = program === p;
            return (
              <button
                key={p}
                onClick={() => setProgram(p)}
                aria-pressed={active}
                className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  active
                    ? 'bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] text-white shadow-[0_0_18px_rgba(124,92,255,0.5)]'
                    : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* branch segmented toggle -- the "student details" (CSE/ECE/...) the
            bot fetches at login; BTech only, BBA has no engineering branch */}
        {program === 'BTech' && (
          <div
            className="animate-rise mt-3 inline-flex flex-wrap gap-1 rounded-full p-1 glass"
            style={{ animationDelay: '90ms' }}
            role="group"
            aria-label="Branch"
          >
            {BRANCHES.map((b) => {
              const active = branch === b;
              return (
                <button
                  key={b}
                  onClick={() => setBranch(b)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                    active
                      ? 'bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] text-white shadow-[0_0_18px_rgba(124,92,255,0.5)]'
                      : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        )}

        {/* persona cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STAGES.map((stage, i) => (
            <article
              key={stage.year}
              className="animate-rise glass group flex flex-col rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 focus-within:border-[var(--cyan)]/50 hover:border-[var(--cyan)]/50 hover:shadow-[0_0_30px_-8px_rgba(56,225,255,0.35)]"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-xs font-bold text-black shadow-[0_0_14px_rgba(56,225,255,0.5)]">
                  {stage.year}
                </span>
                <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                  Year {stage.year} · {stage.name}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-dim)]">{stage.blurb}</p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => launch(stage.year, true)}
                  className="rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,92,255,0.5)] transition-transform duration-150 hover:brightness-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  New student
                </button>
                <button
                  onClick={() => launch(stage.year, false)}
                  className="rounded-full border border-[var(--glass-brd)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--ink-dim)] transition-colors duration-150 hover:border-[var(--cyan)]/50 hover:text-[var(--ink)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Returning student
                </button>
              </div>
            </article>
          ))}
        </div>

        <p
          className="animate-rise mt-8 max-w-[70ch] text-xs leading-relaxed text-[var(--ink-dim)]"
          style={{ animationDelay: '420ms' }}
        >
          &ldquo;New student&rdquo; always starts fresh at the catch-up intro. &ldquo;Returning
          student&rdquo; reuses the same demo id: the first click behaves like new, later clicks
          (after completing a conversation once) hit the continue entry node.
        </p>
      </div>
    </main>
  );
}
