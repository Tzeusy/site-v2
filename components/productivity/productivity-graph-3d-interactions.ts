export type InteractionGraphNodeType = "category" | "post";

export type InteractionGraphNode = {
  id: string;
  nodeType: InteractionGraphNodeType;
  color: string;
};

type EndpointNode = {
  id: string;
};

export type InteractionGraphLink = {
  id: string;
  source: string | EndpointNode;
  target: string | EndpointNode;
  color: string;
  isDraft: boolean;
  draftDimColor?: string;
};

export type SemanticVisibility = {
  visibleNodeIds: Set<string> | null;
  visibleLinkIds: Set<string> | null;
};

export type NodeVisualState = {
  color: string;
  opacity: number;
  scale: number;
};

export type LinkVisualState = {
  color: string;
  opacity: number;
  width: number;
};

const DIMMED_NODE_OPACITY = 0.18;
const DIMMED_NODE_SCALE = 0.7;
const ACTIVE_NODE_SCALE = 1.3;
const DIMMED_LINK_OPACITY = 0.12;
const DEFAULT_LINK_OPACITY = 0.5;
const DEFAULT_LINK_WIDTH = 1;
const DIMMED_LINK_WIDTH = 0.25;
const ACTIVE_LINK_WIDTH = 1.8;
const DRAFT_LINK_DIM_TARGET = "#78716c";
const DRAFT_LINK_DIM_RATIO = 0.58;

function nodeBrightenFactor(nodeType: InteractionGraphNodeType) {
  return nodeType === "category" ? 1.2 : 1.4;
}

function endpointToId(endpoint: string | EndpointNode) {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 127, g: 127, b: 127 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${clampChannel(r).toString(16).padStart(2, "0")}${clampChannel(g)
    .toString(16)
    .padStart(2, "0")}${clampChannel(b).toString(16).padStart(2, "0")}`;
}

function brightenColor(hex: string, factor: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    rgb.r + ((255 - rgb.r) * (factor - 1)) / factor,
    rgb.g + ((255 - rgb.g) * (factor - 1)) / factor,
    rgb.b + ((255 - rgb.b) * (factor - 1)) / factor,
  );
}

function mixColor(sourceHex: string, targetHex: string, targetRatio: number) {
  const source = hexToRgb(sourceHex);
  const target = hexToRgb(targetHex);
  const clampedTargetRatio = Math.max(0, Math.min(1, targetRatio));
  const sourceRatio = 1 - clampedTargetRatio;

  return rgbToHex(
    source.r * sourceRatio + target.r * clampedTargetRatio,
    source.g * sourceRatio + target.g * clampedTargetRatio,
    source.b * sourceRatio + target.b * clampedTargetRatio,
  );
}

function isEdgeConnectedToNode(link: InteractionGraphLink, nodeId: string) {
  const sourceId = endpointToId(link.source);
  const targetId = endpointToId(link.target);
  return sourceId === nodeId || targetId === nodeId;
}

function baseLinkColor(link: InteractionGraphLink) {
  if (!link.isDraft) return link.color;
  return mixColor(link.color, link.draftDimColor ?? DRAFT_LINK_DIM_TARGET, DRAFT_LINK_DIM_RATIO);
}

export function buildSemanticVisibility(
  activeNodeId: string | null,
  nodes: InteractionGraphNode[],
  links: InteractionGraphLink[],
): SemanticVisibility {
  if (!activeNodeId) {
    return { visibleNodeIds: null, visibleLinkIds: null };
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const activeNode = nodeMap.get(activeNodeId);
  if (!activeNode) {
    return { visibleNodeIds: null, visibleLinkIds: null };
  }

  const visibleNodeIds = new Set<string>([activeNodeId]);
  const visibleLinkIds = new Set<string>();

  if (activeNode.nodeType === "post") {
    links.forEach((link) => {
      if (!isEdgeConnectedToNode(link, activeNodeId)) return;
      const sourceId = endpointToId(link.source);
      const targetId = endpointToId(link.target);
      visibleLinkIds.add(link.id);
      visibleNodeIds.add(sourceId);
      visibleNodeIds.add(targetId);
    });

    return { visibleNodeIds, visibleLinkIds };
  }

  const linkedPostIds = new Set<string>();
  links.forEach((link) => {
    if (!isEdgeConnectedToNode(link, activeNodeId)) return;
    const sourceId = endpointToId(link.source);
    const targetId = endpointToId(link.target);
    const neighborId = sourceId === activeNodeId ? targetId : sourceId;
    const neighbor = nodeMap.get(neighborId);
    if (neighbor?.nodeType !== "post") return;
    linkedPostIds.add(neighborId);
    visibleNodeIds.add(neighborId);
  });

  links.forEach((link) => {
    const sourceId = endpointToId(link.source);
    const targetId = endpointToId(link.target);
    if (!linkedPostIds.has(sourceId) && !linkedPostIds.has(targetId)) return;
    visibleLinkIds.add(link.id);
    visibleNodeIds.add(sourceId);
    visibleNodeIds.add(targetId);
  });

  return { visibleNodeIds, visibleLinkIds };
}

export function resolveNodeVisualState(
  node: InteractionGraphNode,
  activeNodeId: string | null,
  visibleNodeIds: Set<string> | null,
): NodeVisualState {
  const isVisible = !visibleNodeIds || visibleNodeIds.has(node.id);
  if (!isVisible) {
    return {
      color: node.color,
      opacity: DIMMED_NODE_OPACITY,
      scale: DIMMED_NODE_SCALE,
    };
  }

  const isSemanticHighlightingActive = activeNodeId !== null && visibleNodeIds !== null;
  const highlightedColor = brightenColor(node.color, nodeBrightenFactor(node.nodeType));

  if (activeNodeId === node.id) {
    return {
      color: highlightedColor,
      opacity: 1,
      scale: ACTIVE_NODE_SCALE,
    };
  }

  if (isSemanticHighlightingActive) {
    return {
      color: highlightedColor,
      opacity: 1,
      scale: 1,
    };
  }

  return {
    color: node.color,
    opacity: 1,
    scale: 1,
  };
}

export function resolveLinkVisualState(
  link: InteractionGraphLink,
  activeNodeId: string | null,
  visibleLinkIds: Set<string> | null,
): LinkVisualState {
  const baseColor = baseLinkColor(link);
  const isVisible = !visibleLinkIds || visibleLinkIds.has(link.id);
  if (!isVisible) {
    return {
      color: baseColor,
      opacity: DIMMED_LINK_OPACITY,
      width: DIMMED_LINK_WIDTH,
    };
  }

  if (activeNodeId && isEdgeConnectedToNode(link, activeNodeId)) {
    return {
      color: brightenColor(baseColor, 1.35),
      opacity: 1,
      width: ACTIVE_LINK_WIDTH,
    };
  }

  return {
    color: baseColor,
    opacity: DEFAULT_LINK_OPACITY,
    width: DEFAULT_LINK_WIDTH,
  };
}
