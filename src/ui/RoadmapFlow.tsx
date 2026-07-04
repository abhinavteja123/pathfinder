'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { RoadmapCategory, RoadmapItemRecord, RoadmapStatus } from '@/data/repository';

type ToggleSave = (itemId: string, nextStatus: RoadmapStatus) => void;

interface CardData extends Record<string, unknown> {
  item: RoadmapItemRecord;
  onToggleSave?: ToggleSave;
}

const BADGE: Record<RoadmapCategory, string> = {
  milestone: '⭐',
  hackathon: '🏆',
  internship: '💼',
  oss: '🌱',
};

/** Single roadmap card. Interactive bits carry `nodrag`/`nopan` so clicks aren't
 * swallowed by React Flow's pan/drag handling. */
function CardNode({ data }: NodeProps<Node<CardData>>) {
  const { item, onToggleSave } = data;
  const isMilestone = item.category === 'milestone';
  const saved = item.status === 'saved';
  return (
    <div
      className="glass w-52 rounded-2xl px-4 py-3 text-left"
      style={isMilestone ? { borderColor: 'rgba(56,225,255,0.5)' } : undefined}
    >
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />

      <div className="mb-1 flex items-center gap-2">
        <span className="text-base leading-none">{BADGE[item.category]}</span>
        <span className="font-display text-sm font-semibold text-[var(--ink)]">{item.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--ink-dim)]">{item.description}</p>

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
        {!isMilestone && onToggleSave && (
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
}

export default function RoadmapFlow({ items, onToggleSave, compact = false }: RoadmapFlowProps) {
  const { nodes, edges } = useMemo(() => {
    const milestones = items
      .filter((i) => i.category === 'milestone')
      .sort((a, b) => a.order - b.order);
    const opportunities = items
      .filter((i) => i.category !== 'milestone')
      .sort((a, b) => a.order - b.order);

    // The "you're here now" milestone is where the opportunity branch hangs off;
    // fall back to the last milestone if generation didn't mark one.
    const current =
      milestones.find((m) => m.description.toLowerCase().includes("you're here")) ??
      milestones[milestones.length - 1];

    const nodes: Node<CardData>[] = [];
    milestones.forEach((m, i) => {
      nodes.push({
        id: m.itemId,
        type: 'card',
        position: { x: i * 260, y: 0 },
        data: { item: m, onToggleSave },
      });
    });
    opportunities.forEach((o, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      nodes.push({
        id: o.itemId,
        type: 'card',
        position: { x: col * 260, y: 220 + row * 180 },
        data: { item: o, onToggleSave },
      });
    });

    const edges: Edge[] = [];
    for (let i = 0; i < milestones.length - 1; i++) {
      edges.push({
        id: `spine-${i}`,
        source: milestones[i].itemId,
        sourceHandle: 'right',
        target: milestones[i + 1].itemId,
        targetHandle: 'left',
        type: 'smoothstep',
        style: { stroke: 'rgba(56,225,255,0.55)', strokeWidth: 2 },
      });
    }
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
          style: { stroke: 'rgba(124,92,255,0.45)' },
        });
      });
    }

    return { nodes, edges };
  }, [items, onToggleSave]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
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
