import { describe, expect, it } from "vitest";

import {
  computePrimaryPath,
  computeProcessFlowLayout,
} from "@/components/visuals/process-flow/process-flow-layout";

const linearStages = [
  { id: "start", label: "Start", next: ["middle"] },
  { id: "middle", label: "Middle", next: ["end"] },
  { id: "end", label: "End", next: [] },
];

const branchingStages = [
  { id: "start", label: "Start", next: ["a", "b"] },
  { id: "a", label: "A", next: ["end"] },
  { id: "b", label: "B", next: ["end"] },
  { id: "end", label: "End", next: [] },
];

describe("computeProcessFlowLayout", () => {
  it("places a linear chain at increasing depths", () => {
    const { nodes } = computeProcessFlowLayout(linearStages);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get("start")!.y).toBeLessThan(byId.get("middle")!.y);
    expect(byId.get("middle")!.y).toBeLessThan(byId.get("end")!.y);
  });

  it("spreads siblings at the same depth horizontally", () => {
    const { nodes } = computeProcessFlowLayout(branchingStages);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get("a")!.y).toBeCloseTo(byId.get("b")!.y);
    expect(byId.get("a")!.x).not.toBeCloseTo(byId.get("b")!.x);
  });

  it("produces one edge per next-reference", () => {
    const { edges } = computeProcessFlowLayout(branchingStages);
    expect(edges).toHaveLength(4);
  });
});

describe("computePrimaryPath", () => {
  it("walks the full chain for a linear flow", () => {
    expect(computePrimaryPath(linearStages)).toEqual(["start", "middle", "end"]);
  });

  it("follows the first branch at a fork", () => {
    expect(computePrimaryPath(branchingStages)).toEqual(["start", "a", "end"]);
  });

  it("stops rather than looping on a cycle", () => {
    const cyclic = [
      { id: "x", label: "X", next: ["y"] },
      { id: "y", label: "Y", next: ["x"] },
    ];
    const path = computePrimaryPath(cyclic);
    expect(path.length).toBeLessThanOrEqual(2);
  });
});
