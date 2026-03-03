import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSemanticVisibility,
  resolveLinkVisualState,
  resolveNodeVisualState,
  type InteractionGraphLink,
  type InteractionGraphNode,
} from "@/components/productivity/productivity-graph-3d-interactions";

const nodes: InteractionGraphNode[] = [
  { id: "cat:a", nodeType: "category", color: "#ff0000" },
  { id: "cat:b", nodeType: "category", color: "#00ff00" },
  { id: "cat:c", nodeType: "category", color: "#0000ff" },
  { id: "post:one", nodeType: "post", color: "#3b82f6" },
  { id: "post:two", nodeType: "post", color: "#3b82f6" },
];

const links: InteractionGraphLink[] = [
  { id: "edge:one-a", source: "post:one", target: "cat:a", color: "#ff0000", isDraft: false },
  { id: "edge:one-b", source: "post:one", target: "cat:b", color: "#00ff00", isDraft: false },
  { id: "edge:two-b", source: "post:two", target: "cat:b", color: "#00ff00", isDraft: false },
];

test("buildSemanticVisibility for active post includes only connected categories and edges", () => {
  const visibility = buildSemanticVisibility("post:one", nodes, links);
  assert.deepEqual(
    Array.from(visibility.visibleNodeIds ?? []).sort(),
    ["cat:a", "cat:b", "post:one"].sort(),
  );
  assert.deepEqual(
    Array.from(visibility.visibleLinkIds ?? []).sort(),
    ["edge:one-a", "edge:one-b"].sort(),
  );
});

test("buildSemanticVisibility for active category includes linked posts and their categories", () => {
  const visibility = buildSemanticVisibility("cat:b", nodes, links);
  assert.deepEqual(
    Array.from(visibility.visibleNodeIds ?? []).sort(),
    ["cat:a", "cat:b", "post:one", "post:two"].sort(),
  );
  assert.deepEqual(
    Array.from(visibility.visibleLinkIds ?? []).sort(),
    ["edge:one-a", "edge:one-b", "edge:two-b"].sort(),
  );
});

test("resolveNodeVisualState dims unrelated nodes, brightens connected nodes, and enlarges active node", () => {
  const visibleNodeIds = new Set(["cat:a", "post:one"]);
  const dimmed = resolveNodeVisualState(nodes[1], "cat:a", visibleNodeIds);
  assert.equal(dimmed.opacity, 0.18);
  assert.equal(dimmed.scale, 0.7);

  const connected = resolveNodeVisualState(nodes[3], "cat:a", visibleNodeIds);
  assert.equal(connected.opacity, 1);
  assert.equal(connected.scale, 1);
  assert.notEqual(connected.color, nodes[3].color);

  const active = resolveNodeVisualState(nodes[0], "cat:a", visibleNodeIds);
  assert.equal(active.opacity, 1);
  assert.equal(active.scale, 1.3);
  assert.notEqual(active.color, nodes[0].color);
});

test("resolveNodeVisualState preserves base color when semantic filtering is inactive", () => {
  const normal = resolveNodeVisualState(nodes[0], null, null);
  assert.equal(normal.opacity, 1);
  assert.equal(normal.scale, 1);
  assert.equal(normal.color, nodes[0].color);
});

test("resolveLinkVisualState dims unrelated links and brightens active-adjacent links", () => {
  const visibleLinkIds = new Set(["edge:one-a"]);
  const dimmed = resolveLinkVisualState(links[2], "cat:a", visibleLinkIds);
  assert.equal(dimmed.opacity, 0.12);
  assert.equal(dimmed.width, 0.25);

  const highlighted = resolveLinkVisualState(links[0], "cat:a", visibleLinkIds);
  assert.equal(highlighted.opacity, 1);
  assert.equal(highlighted.width, 1.8);
  assert.notEqual(highlighted.color, links[0].color);
});

test("resolveLinkVisualState preserves category hue while dimming draft links", () => {
  const draftLink: InteractionGraphLink = {
    id: "edge:draft-one-a",
    source: "post:one",
    target: "cat:a",
    color: "#ef4444",
    isDraft: true,
  };

  const draftVisual = resolveLinkVisualState(draftLink, null, null);
  assert.notEqual(draftVisual.color, draftLink.color);
  assert.notEqual(draftVisual.color, "#78716c");
});

test("resolveLinkVisualState supports theme-specific draft dim colors", () => {
  const draftLink: InteractionGraphLink = {
    id: "edge:draft-two-a",
    source: "post:two",
    target: "cat:a",
    color: "#22c55e",
    isDraft: true,
    draftDimColor: "#fef08a",
  };

  const withThemeTarget = resolveLinkVisualState(draftLink, null, null);
  const withDefaultTarget = resolveLinkVisualState(
    { ...draftLink, draftDimColor: undefined },
    null,
    null,
  );

  assert.notEqual(withThemeTarget.color, withDefaultTarget.color);
});
