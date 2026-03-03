import * as THREE from "three";

export type RenderableGraphNode = {
  nodeType: "category" | "post";
  size: number;
  color: string;
  isDraft?: boolean;
  image?: string;
};

const CATEGORY_SEGMENTS = 36;
const DRAFT_EDGE_OPACITY = 0.55;
const PUBLISHED_EDGE_OPACITY = 0.9;

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
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.LineLoop(geometry, material);
}

export function createNodeObject(
  node: RenderableGraphNode,
  resolveTexture: (imagePath: string) => THREE.Texture | undefined,
) {
  if (node.nodeType === "category") {
    return new THREE.Mesh(
      new THREE.CircleGeometry(node.size, CATEGORY_SEGMENTS),
      new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
      }),
    );
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
      transparent: Boolean(node.isDraft),
      opacity: node.isDraft ? 0.82 : 1,
      side: THREE.DoubleSide,
    }),
  );
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
      maybeDisposable.material.forEach((material) => material.dispose());
    } else {
      maybeDisposable.material?.dispose();
    }
  });
}
