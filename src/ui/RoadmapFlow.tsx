'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { RoadmapCategory, RoadmapItemRecord, RoadmapStatus } from '@/data/repository';

type ToggleSave = (itemId: string, nextStatus: RoadmapStatus) => void;

/** Per-year checklist sub-steps: the engine emits `step-<year>-*` today;
 * `sprint-<year>-*` and `stretch-<year>-*` (Above-50 lane) items get the same
 * stacked rendering and check-off. */
const isSubStep = (itemId: string) =>
  itemId.startsWith('step-') || itemId.startsWith('sprint-') || itemId.startsWith('stretch-');

interface CardData extends Record<string, unknown> {
  item: RoadmapItemRecord;
  onToggleSave?: ToggleSave;
  current?: boolean;
  /** sub-steps show a done checkbox (needs a studentId upstream to persist) */
  checkOff?: boolean;
}

const BADGE: Record<RoadmapCategory, string> = {
  milestone: '◆',
  hackathon: 'H',
  internship: 'I',
  oss: 'O',
};

/** Per-year identity: accent (as "r,g,b" so alpha can vary per use) + badge
 * icon. Year cards, their step stacks, and their edges all pick up the year's
 * color so the journey visibly shifts theme as it moves left to right. */
const YEAR_THEME: Record<number, { accent: string; icon: string }> = {
  1: { accent: '56,225,255', icon: '1' }, // Explorer — teal
  2: { accent: '251,191,36', icon: '2' }, // Builder — amber
  3: { accent: '167,139,250', icon: '3' }, // Closer — violet
  4: { accent: '52,211,153', icon: '4' }, // Launch — green
};

/** Year a milestone/step item belongs to (spine order is 0-indexed year). */
function yearOf(item: RoadmapItemRecord): number | undefined {
  if (isSubStep(item.itemId)) return Number(item.itemId.split('-')[1]);
  if (item.category === 'milestone') return item.order + 1;
  return undefined;
}

/** Single roadmap card. Interactive bits carry `nodrag`/`nopan` so clicks aren't
 * swallowed by React Flow's pan/drag handling. */
function CardNode({ data }: NodeProps<Node<CardData>>) {
  const { item, onToggleSave, current, checkOff } = data;
  // `step-*`/`sprint-*` items are the per-year checklist sub-steps -- render
  // them smaller and dimmer than a year milestone so the spine still reads as
  // the backbone.
  const isStep = isSubStep(item.itemId);
  const isMilestone = item.category === 'milestone' && !isStep;
  const saved = item.status === 'saved';
  const done = item.status === 'done';
  const theme = YEAR_THEME[yearOf(item) ?? 0];
  const accent = theme?.accent ?? '56,225,255';
  return (
    <div
      className={`glass rounded-2xl text-left ${isStep ? 'w-44 px-3 py-2' : 'w-52 px-4 py-3'}`}
      style={
        current
          ? { borderColor: `rgba(${accent},0.95)`, borderWidth: 2, boxShadow: `0 0 0 3px rgba(${accent},0.18)` }
          : isMilestone
            ? { borderColor: `rgba(${accent},0.5)` }
            : isStep
              ? { borderColor: `rgba(${accent},0.35)` }
              : undefined
      }
    >
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />

      <div className={`flex items-center gap-2 ${isStep ? 'mb-0.5' : 'mb-1'}`}>
        <span
          className={isStep ? 'text-sm leading-none' : 'text-base leading-none'}
          style={isStep ? { color: `rgb(${accent})` } : undefined}
        >
          {isStep ? '▹' : isMilestone && theme ? theme.icon : BADGE[item.category]}
        </span>
        <span
          className={`font-display font-semibold text-[var(--ink)] ${isStep ? 'text-xs' : 'text-sm'} ${
            isStep && done ? 'line-through opacity-60' : ''
          }`}
        >
          {item.title}
        </span>
        {isStep && checkOff && onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(item.itemId, done ? 'suggested' : 'done')}
            aria-pressed={done}
            aria-label={done ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
            className={`nodrag nopan ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] leading-none transition-all active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] ${
              done
                ? 'border-transparent bg-[var(--cyan)] text-black'
                : 'border-white/30 text-transparent hover:border-[var(--cyan)]'
            }`}
          >
            ✓
          </button>
        )}
      </div>
      <p className={`leading-relaxed text-[var(--ink-dim)] ${isStep ? 'text-[11px]' : 'text-xs'}`}>{item.description}</p>

      <div className="mt-2.5 flex items-center gap-2">
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="nodrag nopan text-xs font-medium text-[var(--cyan)] hover:underline"
          >
            Open ↗
          </a>
        )}
        {!isMilestone && !isStep && onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(item.itemId, saved ? 'suggested' : 'saved')}
            className={`nodrag nopan ml-auto rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] ${
              saved
                ? 'bg-[var(--cyan)]/20 text-[var(--cyan)]'
                : 'bg-gradient-to-br from-[var(--violet)] to-[var(--violet-deep)] text-white'
            }`}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { card: CardNode };

interface RoadmapFlowProps {
  items: RoadmapItemRecord[];
  onToggleSave?: ToggleSave;
  compact?: boolean;
  /** Who's checking items off. Without it check-off is disabled (nothing to persist against). */
  studentId?: string;
}

export default function RoadmapFlow({ items, onToggleSave, compact = false, studentId }: RoadmapFlowProps) {
  // check-off only in the full view for a known student; compact preview stays read-only
  const checkOff = !compact && !!studentId;
  const { nodes, edges } = useMemo(() => {
    const COL_W = 280;
    const STEP_Y0 = 180; // first step sits below its year card (clears the tallest, the "you're here" one)
    const STEP_DY = 118; // vertical gap between stacked steps

    const milestones = items
      .filter((i) => i.category === 'milestone')
      .sort((a, b) => a.order - b.order);
    // Year milestones are the spine; `step-*` items are per-year checklist
    // sub-steps stacked under their year (engine/roadmap.ts). The compact inline
    // preview skips the steps so the small box stays a clean 4-year spine -- the
    // full /roadmap page is where the depth is meant to be read.
    const years = milestones.filter((m) => !isSubStep(m.itemId));
    const steps = compact ? [] : milestones.filter((m) => isSubStep(m.itemId));
    const opportunities = items
      .filter((i) => i.category !== 'milestone')
      .sort((a, b) => a.order - b.order);

    // year number (milestone order + 1) -> its spine column index
    const colOf = new Map<number, number>();
    years.forEach((m, i) => colOf.set(m.order + 1, i));

    // group steps under their year, preserving within-year order
    const stepsByYear = new Map<number, RoadmapItemRecord[]>();
    for (const s of steps) {
      const year = Number(s.itemId.split('-')[1]);
      const list = stepsByYear.get(year) ?? [];
      list.push(s);
      stepsByYear.set(year, list);
    }
    for (const list of stepsByYear.values()) list.sort((a, b) => a.order - b.order);

    // push the opportunity grid below the tallest step stack so they never overlap
    const maxSteps = steps.length ? Math.max(...[...stepsByYear.values()].map((l) => l.length)) : 0;
    const oppY = maxSteps ? STEP_Y0 + maxSteps * STEP_DY + 60 : 220;

    // The "you're here now" year is where the opportunity branch hangs off;
    // fall back to the last year if generation didn't mark one.
    const current =
      years.find((m) => m.description.toLowerCase().includes("you're here")) ??
      years[years.length - 1];

    const nodes: Node<CardData>[] = [];
    years.forEach((m, i) => {
      nodes.push({
        id: m.itemId,
        type: 'card',
        position: { x: i * COL_W, y: 0 },
        data: { item: m, onToggleSave, current: m.itemId === current?.itemId },
      });
    });
    stepsByYear.forEach((list, year) => {
      const col = colOf.get(year) ?? 0;
      list.forEach((s, k) => {
        nodes.push({
          id: s.itemId,
          type: 'card',
          position: { x: col * COL_W, y: STEP_Y0 + k * STEP_DY },
          data: { item: s, onToggleSave, checkOff },
        });
      });
    });
    opportunities.forEach((o, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      nodes.push({
        id: o.itemId,
        type: 'card',
        position: { x: col * COL_W, y: oppY + row * 180 },
        data: { item: o, onToggleSave, checkOff },
      });
    });

    const edges: Edge[] = [];
    for (let i = 0; i < years.length - 1; i++) {
      // Each spine segment takes the color of the year it leads INTO, so the
      // journey line visibly shifts theme as it moves left to right.
      const accent = YEAR_THEME[years[i + 1].order + 1]?.accent ?? '56,225,255';
      edges.push({
        id: `spine-${i}`,
        source: years[i].itemId,
        sourceHandle: 'right',
        target: years[i + 1].itemId,
        targetHandle: 'left',
        type: 'smoothstep',
        style: { stroke: `rgba(${accent},0.55)`, strokeWidth: 2 },
      });
    }
    // each year -> its first step -> next step (vertical checklist chain)
    stepsByYear.forEach((list, year) => {
      const yearItem = years.find((m) => m.order + 1 === year);
      const accent = YEAR_THEME[year]?.accent ?? '139,110,255';
      list.forEach((s, k) => {
        const src = k === 0 ? yearItem : list[k - 1];
        if (!src) return;
        edges.push({
          id: `step-${s.itemId}`,
          source: src.itemId,
          sourceHandle: 'bottom',
          target: s.itemId,
          targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: `rgba(${accent},0.55)`, strokeWidth: 2 },
        });
      });
    });
    if (current) {
      opportunities.forEach((o) => {
        edges.push({
          id: `branch-${o.itemId}`,
          source: current.itemId,
          sourceHandle: 'bottom',
          target: o.itemId,
          targetHandle: 'top',
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'rgba(139,110,255,0.85)', strokeWidth: 2 },
        });
      });
    } else {
      // No milestone in this items set (e.g. the split-panel "specialization
      // roadmap" view, which only ever receives domain items) -- nothing for
      // opportunities to branch off, so they rendered as disconnected floating
      // cards. Chain them to each other in order instead, so this panel reads
      // as a connected track too, same visual language as the milestone spine.
      // strokeWidth/opacity matched to the spine's -- the original thin
      // 1px/0.45-alpha line was nearly invisible against the dark background
      // and read as still-disconnected even though the edge was there.
      for (let i = 0; i < opportunities.length - 1; i++) {
        edges.push({
          id: `chain-${opportunities[i].itemId}`,
          source: opportunities[i].itemId,
          sourceHandle: 'right',
          target: opportunities[i + 1].itemId,
          targetHandle: 'left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'rgba(139,110,255,0.85)', strokeWidth: 2 },
        });
      }
    }

    return { nodes, edges };
  }, [items, onToggleSave, compact, checkOff]);

  // Real fullscreen for the flow -- the panels are small and the per-year steps
  // need room, so the ⛶ button maximizes the wrapper and re-fits the graph to
  // the new size (React Flow keeps its viewport transform on resize otherwise,
  // which would just add empty margin instead of showing more).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<ReactFlowInstance<Node<CardData>, Edge> | null>(null);
  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);
  useEffect(() => {
    const refit = () => window.setTimeout(() => instRef.current?.fitView({ padding: 0.2 }), 80);
    document.addEventListener('fullscreenchange', refit);
    return () => document.removeEventListener('fullscreenchange', refit);
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full w-full bg-[#0a0a1a]">
      {!compact && (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          title="Fullscreen"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-[var(--ink-dim)] backdrop-blur transition-colors hover:text-[var(--cyan)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        onInit={(inst) => {
          instRef.current = inst;
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable={!compact}
        zoomOnScroll={!compact}
        panOnDrag={!compact}
        zoomOnDoubleClick={!compact}
        panOnScroll={false}
        preventScrolling={false}
        style={{ background: 'transparent' }}
      >
        {!compact && <Background color="rgba(124,92,255,0.15)" gap={28} />}
        {!compact && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
