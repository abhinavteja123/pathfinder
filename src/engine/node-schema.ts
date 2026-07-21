import { z } from 'zod';
import { DOMAIN_CATALOG } from './roadmap';
import type { FixedNode } from './types';

/**
 * Runtime shape for one authored conversation node. This is the single source of
 * truth for what a JSON node may contain -- content-loader.ts parses every entry
 * in the content/*.json trees through this before the engine ever runs, so a
 * malformed node fails LOUD at server boot instead of mid-conversation with a
 * student. `.strict()` rejects unknown keys, so a typo'd field (`sayByAnwser`)
 * is caught too.
 */
const menuOption = z.strictObject({ label: z.string().min(1), next: z.string().min(1) });
const optionList = z.array(menuOption).min(1);

export const nodeSchema = z.strictObject({
  id: z.string().min(1),
  say: z.string().min(1),
  options: optionList.optional(),
  optionsByProgram: z.record(z.string(), optionList).optional(),
  optionsByBranch: z.record(z.string(), optionList).optional(),
  optionsByAnswer: z
    .strictObject({ key: z.string().min(1), map: z.record(z.string(), optionList) })
    .optional(),
  multi: z.boolean().optional(),
  next: z.string().min(1).optional(),
  captureAs: z.string().min(1).optional(),
  sayByAnswer: z
    .strictObject({
      key: z.string().min(1),
      map: z.record(z.string(), z.string().min(1)),
      fallback: z.string().min(1).optional(),
    })
    .optional(),
  terminal: z.boolean().optional(),
  gesture: z.enum(['wave', 'thumbsup', 'peace', 'stop', 'handshake']).optional(),
  arm: z.enum(['left', 'right']).optional(),
});

export const treeSchema = z.array(nodeSchema);

/** Every option group on a node (default + per-program/branch/answer overrides). */
function optionGroups(node: FixedNode): { label: string; next: string }[][] {
  return [
    node.options,
    ...Object.values(node.optionsByProgram ?? {}),
    ...Object.values(node.optionsByBranch ?? {}),
    ...Object.values(node.optionsByAnswer?.map ?? {}),
  ].filter(Boolean) as { label: string; next: string }[][];
}

/**
 * Cross-node contract checks the old inline comments only *described* -- now
 * enforced at boot. Throws with every problem listed at once (not just the
 * first) so a content author fixes them in one pass.
 */
export function validateTree(nodes: Record<string, FixedNode>): void {
  const ids = new Set(Object.keys(nodes));
  const domainKeys = new Set(Object.keys(DOMAIN_CATALOG));
  const errors: string[] = [];

  const target = (from: string, to: string | undefined) => {
    if (to && !ids.has(to)) errors.push(`node "${from}" points to missing node "${to}"`);
  };
  const domains = (from: string, labels: string[]) => {
    for (const l of labels) {
      if (!domainKeys.has(l)) errors.push(`node "${from}" uses domain "${l}" with no roadmap catalog entry`);
    }
  };

  for (const node of Object.values(nodes)) {
    // 1. Every outgoing edge resolves to a real node.
    target(node.id, node.next);
    const groups = optionGroups(node);
    for (const grp of groups) for (const opt of grp) target(node.id, opt.next);

    // 2. Domain contract: any menu capturing `domain`, or any say/options map
    //    keyed on `domain`, may only use labels that resolve to the roadmap
    //    catalog (which is what the /roadmap panel looks up).
    if (node.captureAs === 'domain') domains(node.id, groups.flatMap((g) => g.map((o) => o.label)));
    if (node.sayByAnswer?.key === 'domain') domains(node.id, Object.keys(node.sayByAnswer.map));
    if (node.optionsByAnswer?.key === 'domain') domains(node.id, Object.keys(node.optionsByAnswer.map));

    // 3. A non-terminal node must have some way to advance.
    const canAdvance =
      !!node.next ||
      !!node.options ||
      !!node.optionsByProgram ||
      !!node.optionsByBranch ||
      !!node.optionsByAnswer;
    if (!node.terminal && !canAdvance) {
      errors.push(`node "${node.id}" is non-terminal but has no next/options to advance`);
    }
  }

  if (errors.length) {
    throw new Error(`Question tree validation failed:\n- ${errors.join('\n- ')}`);
  }
}
