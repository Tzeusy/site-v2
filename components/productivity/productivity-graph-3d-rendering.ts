import * as THREE from "three";

export type RenderableGraphNode = {
  id?: string;
  nodeType: "category" | "post";
  label?: string;
  size: number;
  color: string;
  isDraft?: boolean;
  image?: string;
};

export type RenderableNodeLabelType = "category" | "post";

export type NodeLabelUserData = {
  nodeId: string;
  nodeType: RenderableNodeLabelType;
  text: string;
  opacity: number;
  fontStyle: "normal" | "italic";
  fontWeight: "400" | "700";
};

export type RenderableNodeVisualState = {
  color: string;
  opacity: number;
  scale: number;
};

const CATEGORY_SEGMENTS = 36;
const DRAFT_EDGE_OPACITY = 0.55;
const PUBLISHED_EDGE_OPACITY = 0.9;
const LABEL_CANVAS_SCALE = 2;
const CATEGORY_LABEL_FONT_SIZE = 88;
const POST_LABEL_FONT_SIZE = 78;
const CATEGORY_LABEL_WORLD_SCALE = 0.052;
const POST_LABEL_WORLD_SCALE = 0.047;
const LABEL_FONT_FAMILY =
  "\"Inter\", \"IBM Plex Sans\", \"Helvetica Neue\", Arial, sans-serif";
const CATEGORY_LABEL_COLOR = "rgba(28, 25, 23, 1)";
const POST_LABEL_COLOR = "rgba(28, 25, 23, 0.5)";

function buildSquareBorder(size: number, color: string, opacity: number) {
  const half = size / 2;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-half, -half, 0),
    new THREE.Vector3(half, -half, 0),
    new THREE.Vector3(half, half, 0),
    new THREE.Vector3(-half, half, 0),
  ]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  const border = new THREE.LineLoop(geometry, material);
  border.userData.visualRole = "color";
  return border;
}

function getMaterialArray(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function rememberBaseMaterialStyle(material: THREE.Material) {
  const anyMaterial = material as THREE.Material & {
    color?: THREE.Color;
    opacity: number;
    userData: { baseOpacity?: number; baseColorHex?: number };
  };

  if (typeof anyMaterial.userData.baseOpacity !== "number") {
    anyMaterial.userData.baseOpacity = anyMaterial.opacity;
  }
  if (anyMaterial.color && typeof anyMaterial.userData.baseColorHex !== "number") {
    anyMaterial.userData.baseColorHex = anyMaterial.color.getHex();
  }
}

export function applyNodeObjectVisualState(object: THREE.Object3D, visual: RenderableNodeVisualState) {
  object.scale.setScalar(visual.scale);
  object.traverse((child) => {
    const renderable = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
      userData: { visualRole?: string };
    };

    const materials = getMaterialArray(renderable.material);
    if (materials.length === 0) return;

    materials.forEach((material) => {
      rememberBaseMaterialStyle(material);
      const anyMaterial = material as THREE.Material & {
        color?: THREE.Color;
        opacity: number;
        transparent: boolean;
        needsUpdate: boolean;
        userData: { baseOpacity?: number; baseColorHex?: number };
      };

      anyMaterial.transparent = true;
      const baseOpacity =
        typeof anyMaterial.userData.baseOpacity === "number" ? anyMaterial.userData.baseOpacity : 1;
      anyMaterial.opacity = baseOpacity * visual.opacity;

      if (renderable.userData.visualRole === "color" && anyMaterial.color) {
        anyMaterial.color.set(visual.color);
      } else if (anyMaterial.color && typeof anyMaterial.userData.baseColorHex === "number") {
        anyMaterial.color.setHex(anyMaterial.userData.baseColorHex);
      }

      anyMaterial.needsUpdate = true;
    });
  });
}

export function formatNodeLabelText(nodeType: RenderableNodeLabelType, label: string) {
  if (nodeType === "category") return label;
  return `[${label}]`;
}

export function getNodeLabelStyle(nodeType: RenderableNodeLabelType) {
  if (nodeType === "category") {
    return {
      fontSize: CATEGORY_LABEL_FONT_SIZE,
      fontStyle: "normal" as const,
      fontWeight: "700" as const,
      opacity: 1,
      color: CATEGORY_LABEL_COLOR,
      worldScale: CATEGORY_LABEL_WORLD_SCALE,
    };
  }

  return {
    fontSize: POST_LABEL_FONT_SIZE,
    fontStyle: "italic" as const,
    fontWeight: "400" as const,
    opacity: 0.5,
    color: POST_LABEL_COLOR,
    worldScale: POST_LABEL_WORLD_SCALE,
  };
}

export function getNodeLabelOffset(
  nodeType: RenderableNodeLabelType,
  nodeSize: number,
  labelWidth: number,
  labelHeight: number,
) {
  if (nodeType === "category") {
    return {
      x: nodeSize * 0.95 + labelWidth * 0.52,
      y: nodeSize * 0.12,
      z: 0.02,
    };
  }

  return {
    x: 0,
    y: -(nodeSize * 1.02 + labelHeight * 0.56),
    z: 0.02,
  };
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createNodeLabelSprite(node: RenderableGraphNode) {
  if (!node.id || !node.label) return null;

  const text = formatNodeLabelText(node.nodeType, node.label);
  const style = getNodeLabelStyle(node.nodeType);
  const probeCanvas = createCanvas(1, 1);
  const probeContext = probeCanvas.getContext("2d");
  if (!probeContext) return null;

  probeContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${LABEL_FONT_FAMILY}`;
  const metrics = probeContext.measureText(text);
  const textWidth = Math.max(1, Math.ceil(metrics.width));
  const textHeight = Math.max(1, Math.ceil(style.fontSize * 1.15));
  const horizontalPadding = Math.ceil(style.fontSize * 0.2);
  const verticalPadding = Math.ceil(style.fontSize * 0.18);
  const logicalWidth = textWidth + horizontalPadding * 2;
  const logicalHeight = textHeight + verticalPadding * 2;

  const canvas = createCanvas(
    Math.max(1, Math.ceil(logicalWidth * LABEL_CANVAS_SCALE)),
    Math.max(1, Math.ceil(logicalHeight * LABEL_CANVAS_SCALE)),
  );
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.scale(LABEL_CANVAS_SCALE, LABEL_CANVAS_SCALE);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${LABEL_FONT_FAMILY}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = style.color;
  context.fillText(text, horizontalPadding, logicalHeight / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const worldWidth = logicalWidth * style.worldScale;
  const worldHeight = logicalHeight * style.worldScale;
  sprite.scale.set(worldWidth, worldHeight, 1);

  const offset = getNodeLabelOffset(node.nodeType, node.size, worldWidth, worldHeight);
  sprite.position.set(offset.x, offset.y, offset.z);
  sprite.renderOrder = 10;
  sprite.userData = {
    nodeId: node.id,
    nodeType: node.nodeType,
    text,
    opacity: style.opacity,
    fontStyle: style.fontStyle,
    fontWeight: style.fontWeight,
  } satisfies NodeLabelUserData;

  return sprite;
}

export function createNodeObject(
  node: RenderableGraphNode,
  resolveTexture: (imagePath: string) => THREE.Texture | undefined,
) {
  if (node.nodeType === "category") {
    const category = new THREE.Mesh(
      new THREE.CircleGeometry(node.size, CATEGORY_SEGMENTS),
      new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    category.userData.visualRole = "color";
    return category;
  }

  const edgeOpacity = node.isDraft ? DRAFT_EDGE_OPACITY : PUBLISHED_EDGE_OPACITY;
  const edge = buildSquareBorder(node.size, node.color, edgeOpacity);

  if (!node.image) {
    return edge;
  }

  const texture = resolveTexture(node.image);
  if (!texture) {
    return edge;
  }

  const group = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(node.size, node.size),
    new THREE.MeshBasicMaterial({
      map: texture,
      color: node.isDraft ? node.color : "#ffffff",
      transparent: true,
      opacity: node.isDraft ? 0.82 : 1,
      side: THREE.DoubleSide,
    }),
  );
  plane.userData.visualRole = "texture";
  edge.position.z = 0.01;
  group.add(plane);
  group.add(edge);
  return group;
}

export function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child: THREE.Object3D) => {
    const maybeDisposable = child as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    maybeDisposable.geometry?.dispose();

    if (Array.isArray(maybeDisposable.material)) {
      maybeDisposable.material.forEach((material) => {
        const materialWithMaps = material as THREE.Material & {
          map?: THREE.Texture;
          alphaMap?: THREE.Texture;
          emissiveMap?: THREE.Texture;
        };
        materialWithMaps.map?.dispose();
        materialWithMaps.alphaMap?.dispose();
        materialWithMaps.emissiveMap?.dispose();
        material.dispose();
      });
    } else {
      const materialWithMaps = maybeDisposable.material as
        | (THREE.Material & {
            map?: THREE.Texture;
            alphaMap?: THREE.Texture;
            emissiveMap?: THREE.Texture;
          })
        | undefined;
      materialWithMaps?.map?.dispose();
      materialWithMaps?.alphaMap?.dispose();
      materialWithMaps?.emissiveMap?.dispose();
      maybeDisposable.material?.dispose();
    }
  });
}
