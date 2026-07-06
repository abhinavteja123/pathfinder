'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import type { MenuOption, Program, TurnResponse, Year } from '@/engine/types';
import type { RoadmapItemRecord } from '@/data/repository';
import type { CharacterController } from './character-controller';
import RoadmapFlow from './RoadmapFlow';
import { EXPLAINER_SLIDES, shuffle } from './explainer-content';

// Client-only: three.js/WebGL touches window/canvas, so it must not SSR.
const WebglRobotAvatar = dynamic(() => import('./WebglRobotAvatar'), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
}) as ComponentType<{ ref: React.Ref<CharacterController> }>;

interface Message {
  role: 'bot' | 'student';
  text: string;
}

interface PathfinderChatProps {
  studentId: string;
  /** For the "journey" progress card -- real data, not decorative. */
  year?: Year;
  program?: Program;
  /** Swappable per the CharacterController contract. Defaults to the 3D WebGL
   * robot, which itself falls back to the 2D RobotAvatar on render error. */
  Avatar?: ComponentType<{ ref: React.Ref<CharacterController> }>;
  /** Gates the GitHub/LinkedIn/Internshala explainer beats interleaved into
   * the conversation (see `send`/`actuallySend` below). Only for students
   * with no prior history -- returning students shouldn't see these again. */
  isFirstTime?: boolean;
}

const JOURNEY: { year: Year; name: string }[] = [
  { year: 1, name: 'Discover' },
  { year: 2, name: 'Build' },
  { year: 3, name: 'Convert' },
  { year: 4, name: 'Launch' },
];

async function postTurn(studentId: string, nodeId: string, input?: string): Promise<TurnResponse> {
  const res = await fetch('/api/pathfinder/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, nodeId, input }),
  });
  if (!res.ok) throw new Error(`turn request failed: ${res.status}`);
  return res.json();
}

const THINKING_MIN_MS = 2000;

/** Keeps the "thinking" animation on screen for at least `ms`, even if the
 * API replies faster -- makes the robot look like it's actually analysing. */
function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.all([promise, new Promise((resolve) => setTimeout(resolve, ms))]).then(([result]) => result);
}

export default function PathfinderChat({
  studentId,
  year = 1,
  program = 'BTech',
  Avatar = WebglRobotAvatar,
  isFirstTime = false,
}: PathfinderChatProps) {
  const avatarRef = useRef<CharacterController>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [botSay, setBotSay] = useState('');
  const [nodeId, setNodeId] = useState('start');
  const [options, setOptions] = useState<MenuOption[] | undefined>();
  const [stageComplete, setStageComplete] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<RoadmapItemRecord[]>([]);
  const [visibleWords, setVisibleWords] = useState(0);
  // Mid-conversation explainer batch (GitHub/LinkedIn/Internshala/etc) -- 5
  // random slides from the pool, fired as one contiguous "let's explore"
  // sequence right when the FSM reaches discover_transition, for first-time
  // students only. `explainerStep` is which slide in the batch is showing (or
  // null); the answer that triggered the batch waits in `pendingAnswer` until
  // the whole batch is dismissed, then it's actually sent to the engine.
  const [explainerBatch] = useState(() => shuffle(EXPLAINER_SLIDES).slice(0, 5));
  const [explainerStep, setExplainerStep] = useState<number | null>(null);
  const [explainerBatchDone, setExplainerBatchDone] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const activeExplainer = explainerStep !== null ? explainerBatch[explainerStep] : null;
  const explainerOnLeft = explainerStep !== null && explainerStep % 2 === 0;
  // Split the generated roadmap into the universal milestone spine and the
  // domain-specific catalog (see engine/roadmap.ts's DOMAIN_CATALOG) so they
  // render as two separate panels -- "one fixed for everyone, one stored
  // based on the domain answer" per the user's spec. Falls back to the
  // single combined view when there's no domain-tagged roadmap (Y2-4/BBA).
  const milestoneItems = roadmap.filter((i) => i.category === 'milestone');
  const domainItems = roadmap.filter((i) => i.itemId.startsWith('domain-'));

  // Stream the bot line in word-by-word rather than dumping the whole sentence at once.
  useEffect(() => {
    if (!botSay) {
      setVisibleWords(0);
      return;
    }
    setVisibleWords(0);
    const words = botSay.split(' ');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVisibleWords(i);
      if (i >= words.length) clearInterval(id);
    }, 110);
    return () => clearInterval(id);
  }, [botSay]);

  function applyResponse(response: TurnResponse) {
    setMessages((prev) => [...prev, { role: 'bot', text: response.say }]);
    setBotSay(response.say);
    setNodeId(response.nodeId);
    setOptions(response.options);
    setStageComplete(response.stageComplete);
    // Stage-complete is a milestone worth celebrating even though the engine's
    // own animationState for a terminal node is just 'talking'.
    avatarRef.current?.play(response.stageComplete ? 'celebrating' : response.animationState);
    // speak() is optional on CharacterController (only the WebGL avatar implements
    // it) -- it handles TTS + mood-based expression/gesture for the delivered line.
    // play() above is gesture-free (SVG-fallback compatibility only), so this is
    // the only call that can trigger a gesture -- no double-firing.
    avatarRef.current?.speak?.(response.say, {
      celebrate: response.stageComplete,
      gesture: response.gesture,
      arm: response.arm,
    });
  }

  const startedRef = useRef(false);

  useEffect(() => {
    // Guards React Strict Mode's dev double-invoke: two concurrent 'start'
    // requests can race on the conversation log and misread hasHistory.
    if (startedRef.current) return;
    startedRef.current = true;

    avatarRef.current?.play('thinking');
    withMinDelay(postTurn(studentId, 'start'), THINKING_MIN_MS)
      .then(applyResponse)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Animate the speech bubble on each new bot line.
  useEffect(() => {
    if (bubbleRef.current) {
      gsap.fromTo(
        bubbleRef.current,
        { opacity: 0, y: 10, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [botSay]);

  // Keep the transcript card scrolled to the latest turn.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  // On onboarding completion, pull the generated roadmap for the inline preview.
  const roadmapFetchedRef = useRef(false);
  useEffect(() => {
    if (!stageComplete || roadmapFetchedRef.current) return;
    roadmapFetchedRef.current = true;
    fetch(`/api/pathfinder/roadmap?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: RoadmapItemRecord[] }) => setRoadmap(d.items))
      .catch(() => {});
  }, [stageComplete, studentId]);

  async function actuallySend(value: string) {
    setLoading(true);
    avatarRef.current?.play('thinking');
    try {
      const response = await withMinDelay(postTurn(studentId, nodeId, value), THINKING_MIN_MS);
      applyResponse(response);
    } finally {
      setLoading(false);
    }
  }

  async function send(value: string) {
    if (!value.trim() || stageComplete) return;
    setMessages((prev) => [...prev, { role: 'student', text: value }]);
    setInput('');

    // Intercept exactly once, right at the conversation's transition line:
    // hold the answer, narrate the 5-slide explainer batch instead of
    // advancing the FSM. Continuing through all 5 sends the held answer.
    if (isFirstTime && nodeId === 'discover_transition' && !explainerBatchDone) {
      setPendingAnswer(value);
      setExplainerStep(0);
      const slide = explainerBatch[0];
      avatarRef.current?.speak?.(slide.body, { gesture: slide.gesture, arm: slide.arm });
      return;
    }

    await actuallySend(value);
  }

  function continueFromExplainer() {
    if (explainerStep === null) return;
    const nextStep = explainerStep + 1;
    if (nextStep < explainerBatch.length) {
      setExplainerStep(nextStep);
      const slide = explainerBatch[nextStep];
      avatarRef.current?.speak?.(slide.body, { gesture: slide.gesture, arm: slide.arm });
      return;
    }
    setExplainerStep(null);
    setExplainerBatchDone(true);
    const value = pendingAnswer;
    setPendingAnswer(null);
    if (value !== null) actuallySend(value);
  }

  return (
    <main className="space-bg starfield relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-sm font-bold text-black shadow-[0_0_20px_rgba(124,92,255,0.6)]">
            P
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Pathfinder</span>
        </div>
        <span className="glass hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--ink-dim)] sm:block">
          {program} · Year {year}
        </span>
      </header>

      {/* left: live transcript card (real conversation, not decoration) --
          hidden while an explainer is active: the mascot docks left/right
          during explainers and its speech bubble would otherwise overlap
          this fixed-position panel, garbling both (caught from a screenshot). */}
      {!activeExplainer && (
        <aside className="animate-rise absolute left-6 top-24 z-20 hidden w-64 lg:block">
          <div className="glass rounded-2xl p-4">
            <p className="mb-2 font-display text-sm font-semibold text-[var(--ink)]">Conversation</p>
            <div ref={logRef} className="chat-scroll flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="text-xs text-[var(--ink-dim)]">Starting up…</p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === 'bot'
                      ? 'self-start rounded-xl rounded-bl-sm bg-white/5 px-3 py-1.5 text-xs text-[var(--ink)]'
                      : 'self-end rounded-xl rounded-br-sm bg-[var(--violet)]/25 px-3 py-1.5 text-xs text-white'
                  }
                >
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* right: journey progress card (derived from year -- real) -- same
          hide-during-explainer reasoning as the transcript panel above. */}
      {!activeExplainer && (
        <aside className="animate-rise absolute right-6 top-24 z-20 hidden w-60 lg:block">
          <div className="glass rounded-2xl p-4">
            <p className="mb-3 font-display text-sm font-semibold">Your journey</p>
            <ol className="flex flex-col gap-2.5">
              {JOURNEY.map((s) => {
                const done = s.year < year;
                const active = s.year === year;
                return (
                  <li key={s.year} className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                        active
                          ? 'bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-black shadow-[0_0_14px_rgba(56,225,255,0.6)]'
                          : done
                            ? 'bg-[var(--cyan)]/20 text-[var(--cyan)]'
                            : 'bg-white/5 text-[var(--ink-dim)]'
                      }`}
                    >
                      {done ? '✓' : s.year}
                    </span>
                    <span
                      className={`text-sm ${active ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-dim)]'}`}
                    >
                      {s.name}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      )}

      {/* center hero -- bubble + mascot grouped as one tight unit */}
      <section
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-4 ${
          activeExplainer ? 'sm:min-h-[24rem]' : ''
        }`}
      >
        <div
          className={`relative flex flex-col items-center ${
            activeExplainer
              ? `sm:absolute sm:top-1/2 sm:-translate-y-1/2 sm:transition-[left] sm:duration-700 sm:ease-in-out ${
                  explainerOnLeft ? 'sm:left-[4%]' : 'sm:left-[54%]'
                }`
              : ''
          }`}
        >
          {/* speech bubble, anchored just above the mascot's head -- shows the
              explainer's line while one is active, the normal streamed reply otherwise */}
          <div className="relative z-20 -mb-7 w-[min(88vw,25rem)] sm:-mb-9">
            <div
              ref={bubbleRef}
              className="glass mx-auto w-fit max-w-full rounded-3xl px-5 py-3.5 text-center"
            >
              {activeExplainer ? (
                <p className="font-display text-[15px] leading-relaxed text-[var(--ink)]">
                  {activeExplainer.body}
                </p>
              ) : loading && !botSay ? (
                <div className="flex justify-center">
                  <TypingDots />
                </div>
              ) : (
                <p className="font-display text-[15px] leading-relaxed text-[var(--ink)]">
                  {botSay.split(' ').slice(0, visibleWords).join(' ')}
                </p>
              )}
              {!activeExplainer && loading && botSay && (
                <div className="mt-2 flex justify-center">
                  <TypingDots />
                </div>
              )}
            </div>
            {/* centered tail pointing down at the head */}
            <div className="mx-auto -mt-1.5 h-4 w-4 rotate-45 rounded-[4px] border-b border-r border-[var(--glass-brd)] bg-[var(--glass)]" />
          </div>

          {/* mascot on glowing ring platform */}
          <div className="relative flex h-72 w-72 items-center justify-center sm:h-96 sm:w-96">
            {/* ground glow pool */}
            <div className="pointer-events-none absolute bottom-12 left-1/2 h-24 w-64 -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,_rgba(203,213,225,0.40),_rgba(148,163,184,0.22)_45%,_transparent_70%)] blur-2xl" />
            {/* spinning ring platform (flattened to a ground ellipse) */}
            <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 [transform:translateX(-50%)_perspective(420px)_rotateX(72deg)]">
              <div
                className="ring-spin h-56 w-56 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent, rgba(203,213,225,0.05), rgba(148,163,184,0.85), rgba(203,213,225,0.95), transparent 75%)',
                  WebkitMask: 'radial-gradient(circle, transparent 58%, #000 60%)',
                  mask: 'radial-gradient(circle, transparent 58%, #000 60%)',
                }}
              />
              <div
                className="ring-spin-rev absolute inset-4 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 180deg, transparent, rgba(148,163,184,0.5), transparent 60%)',
                  WebkitMask: 'radial-gradient(circle, transparent 62%, #000 64%)',
                  mask: 'radial-gradient(circle, transparent 62%, #000 64%)',
                }}
              />
            </div>
            {/* the mascot -- nudged up so its head meets the bubble tail */}
            <div className="animate-float relative z-10 h-full w-full [transform:translateY(-8%)]">
              <Avatar ref={avatarRef} />
            </div>

            {/* explicit "analysing" badge -- the canvas-drawn thinking eyes alone
                are easy to miss, so pair them with an unmistakable DOM indicator */}
            {loading && (
              <div className="glass pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                <span className="text-xs font-medium text-[var(--ink-dim)]">Analysing…</span>
              </div>
            )}
          </div>
        </div>

        {/* explainer concept card -- docks the OPPOSITE side from the mascot,
            so they visibly swap places, same idea as the retired standalone
            Tour but interleaved into the real conversation instead of upfront */}
        {activeExplainer && (
          <div
            className={`animate-rise glass mt-6 w-[min(88vw,22rem)] rounded-3xl p-6 sm:absolute sm:top-1/2 sm:mt-0 sm:w-[40%] sm:-translate-y-1/2 sm:transition-[left] sm:duration-700 sm:ease-in-out ${
              explainerOnLeft ? 'sm:left-[54%]' : 'sm:left-[4%]'
            }`}
          >
            <h3 className="font-display text-base font-semibold text-[var(--ink)]">{activeExplainer.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-dim)]">{activeExplainer.body}</p>
            <div className="mt-4 flex justify-center">{activeExplainer.visual}</div>
          </div>
        )}
      </section>

      {/* bottom controls */}
      <footer className="relative z-20 mx-auto w-full max-w-xl px-4 pb-8">
        {activeExplainer ? (
          <div className="flex justify-center">
            <button
              onClick={continueFromExplainer}
              className="rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,92,255,0.55)] transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Continue →
            </button>
          </div>
        ) : stageComplete ? (
          <div className="glass animate-rise rounded-2xl px-5 py-4 text-center">
            <p className="font-display text-base font-semibold text-[var(--cyan)]">
              🎉 Onboarding complete — here&apos;s your roadmap.
            </p>
            {roadmap.length > 0 &&
              (domainItems.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--ink-dim)]">Your journey</p>
                    <div className="h-56 overflow-hidden rounded-xl border border-[var(--glass-brd)] bg-black/20">
                      <RoadmapFlow items={milestoneItems} compact />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--ink-dim)]">Your specialization roadmap</p>
                    <div className="h-56 overflow-hidden rounded-xl border border-[var(--glass-brd)] bg-black/20">
                      <RoadmapFlow items={domainItems} compact />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 h-64 overflow-hidden rounded-xl border border-[var(--glass-brd)] bg-black/20">
                  <RoadmapFlow items={roadmap} compact />
                </div>
              ))}
            <a
              href={`/roadmap?studentId=${encodeURIComponent(studentId)}&year=${year}&program=${program}`}
              className="mt-3 inline-block rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,92,255,0.55)] transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Open full roadmap →
            </a>
          </div>
        ) : (
          <>
            {options && options.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {options.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => send(o.label)}
                    disabled={loading}
                    className="glass rounded-full px-4 py-2.5 text-sm text-[var(--ink)] transition-all duration-150 hover:border-[var(--cyan)]/50 hover:text-white active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="glass flex items-center gap-2 rounded-full py-2 pl-5 pr-2 transition-colors focus-within:border-[var(--cyan)]/50"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input
                  id="pf-message"
                  name="message"
                  aria-label="Message Pathfinder"
                  autoComplete="off"
                  className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-dim)] focus:outline-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message Pathfinder…`}
                  disabled={loading}
                />
                <button
                  type="button"
                  title="Voice input (coming soon)"
                  aria-label="Voice input (coming soon)"
                  className="grid h-9 w-9 place-items-center rounded-full text-[var(--ink-dim)] transition-colors hover:text-[var(--cyan)]"
                >
                  <MicIcon />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Send"
                  className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] text-white shadow-[0_0_20px_rgba(124,92,255,0.55)] transition-transform duration-150 active:scale-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <ArrowUpIcon />
                </button>
              </form>
            )}
          </>
        )}
      </footer>
    </main>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
