import { treeSchema, validateTree } from './node-schema';
import type { FixedNode } from './types';
import y1 from './content/y1-discover.json';
import y2 from './content/y2-build.json';
import y3 from './content/y3-convert.json';
import y4 from './content/y4-launch.json';

/**
 * Loads the rule-based question trees from JSON at module init, validates each
 * against node-schema, merges them into one id -> node map, and runs the
 * cross-node contract checks. Any problem throws HERE (server boot), never mid
 * conversation. This replaces the old hand-written `nodes.ts` object: content
 * now lives in editable JSON (content/*.json), code only loads + validates it.
 */
function parseFile(raw: unknown, file: string): FixedNode[] {
  const parsed = treeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid question tree in ${file}:\n${JSON.stringify(parsed.error.issues, null, 2)}`);
  }
  return parsed.data as FixedNode[];
}

const files: [unknown, string][] = [
  [y1, 'y1-discover.json'],
  [y2, 'y2-build.json'],
  [y3, 'y3-convert.json'],
  [y4, 'y4-launch.json'],
];

export const NODES: Record<string, FixedNode> = {};
for (const [raw, name] of files) {
  for (const node of parseFile(raw, name)) {
    if (NODES[node.id]) throw new Error(`Duplicate node id "${node.id}" (second copy in ${name})`);
    NODES[node.id] = node;
  }
}

validateTree(NODES);

export function requireNode(id: string): FixedNode {
  const node = NODES[id];
  if (!node) throw new Error(`Unknown node: ${id}`);
  return node;
}
