import type { ProcessStage } from "@/lib/schema/templates/processFlowDiagram";

export interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

function computeDepths(stages: ProcessStage[]): Map<string, number> {
  const idToStage = new Map(stages.map((s) => [s.id, s]));
  const incoming = new Map<string, number>();
  stages.forEach((s) => incoming.set(s.id, 0));
  stages.forEach((s) =>
    s.next.forEach((n) => {
      if (incoming.has(n)) incoming.set(n, (incoming.get(n) ?? 0) + 1);
    })
  );

  const roots = stages.filter((s) => (incoming.get(s.id) ?? 0) === 0).map((s) => s.id);
  const rootIds = roots.length > 0 ? roots : stages.length > 0 ? [stages[0].id] : [];

  const depth = new Map<string, number>();
  rootIds.forEach((id) => depth.set(id, 0));
  const queue = [...rootIds];
  const visited = new Set(rootIds);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const stage = idToStage.get(current);
    if (!stage) continue;
    for (const nextId of stage.next) {
      if (!idToStage.has(nextId)) continue;
      const candidate = (depth.get(current) ?? 0) + 1;
      if (!depth.has(nextId) || candidate > (depth.get(nextId) ?? 0)) {
        depth.set(nextId, candidate);
      }
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push(nextId);
      }
    }
  }

  stages.forEach((s) => {
    if (!depth.has(s.id)) depth.set(s.id, 0);
  });
  return depth;
}

/** Auto-layout: depth (BFS distance from a root) sets the row; siblings at the same depth are spread evenly. Coordinates are normalized to [0, 1]. */
export function computeProcessFlowLayout(stages: ProcessStage[]): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
} {
  if (stages.length === 0) return { nodes: [], edges: [] };

  const idToStage = new Map(stages.map((s) => [s.id, s]));
  const depth = computeDepths(stages);
  const maxDepth = Math.max(...Array.from(depth.values()));

  const byDepth = new Map<number, string[]>();
  stages.forEach((s) => {
    const d = depth.get(s.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)?.push(s.id);
  });

  const nodes: LayoutNode[] = stages.map((s) => {
    const d = depth.get(s.id) ?? 0;
    const siblings = byDepth.get(d) ?? [s.id];
    const i = siblings.indexOf(s.id);
    return {
      id: s.id,
      label: s.label,
      x: (i + 1) / (siblings.length + 1),
      y: maxDepth === 0 ? 0.5 : d / maxDepth,
    };
  });

  const edges: LayoutEdge[] = stages.flatMap((s) =>
    s.next.filter((n) => idToStage.has(n)).map((n) => ({ from: s.id, to: n }))
  );

  return { nodes, edges };
}

/** Walks the "first branch at every fork" path, for animating a single progression through a possibly-branching flow. */
export function computePrimaryPath(stages: ProcessStage[]): string[] {
  if (stages.length === 0) return [];
  const idToStage = new Map(stages.map((s) => [s.id, s]));
  const incoming = new Map<string, number>();
  stages.forEach((s) => incoming.set(s.id, 0));
  stages.forEach((s) =>
    s.next.forEach((n) => {
      if (incoming.has(n)) incoming.set(n, (incoming.get(n) ?? 0) + 1);
    })
  );
  const root = stages.find((s) => (incoming.get(s.id) ?? 0) === 0)?.id ?? stages[0].id;

  const path = [root];
  const seen = new Set([root]);
  let current = root;
  for (;;) {
    const nextId = idToStage.get(current)?.next[0];
    if (!nextId || seen.has(nextId) || !idToStage.has(nextId)) break;
    path.push(nextId);
    seen.add(nextId);
    current = nextId;
  }
  return path;
}
