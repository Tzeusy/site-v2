import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createNodeObject } from "@/components/productivity/productivity-graph-3d-rendering";

test("renders category nodes as circle meshes", () => {
  const nodeObject = createNodeObject(
    {
      nodeType: "category",
      size: 12,
      color: "#f59e0b",
    },
    () => undefined,
  );

  assert.ok(nodeObject instanceof THREE.Mesh);
  const mesh = nodeObject as THREE.Mesh;
  assert.ok(mesh.geometry instanceof THREE.CircleGeometry);
});

test("renders posts with thumbnails as square planes plus borders", () => {
  const texture = new THREE.Texture();
  const nodeObject = createNodeObject(
    {
      nodeType: "post",
      size: 9,
      color: "#3b82f6",
      image: "/blog/example/thumb.png",
    },
    () => texture,
  );

  assert.ok(nodeObject instanceof THREE.Group);
  const group = nodeObject as THREE.Group;
  assert.equal(group.children.length, 2);
  assert.ok(group.children[0] instanceof THREE.Mesh);
  assert.ok(group.children[1] instanceof THREE.LineLoop);
});

test("renders posts without thumbnails as wireframe-only squares", () => {
  const nodeObject = createNodeObject(
    {
      nodeType: "post",
      size: 8,
      color: "#3b82f6",
    },
    () => undefined,
  );

  assert.ok(nodeObject instanceof THREE.LineLoop);
});

test("dims draft post borders", () => {
  const nodeObject = createNodeObject(
    {
      nodeType: "post",
      size: 8,
      color: "#94a3b8",
      isDraft: true,
    },
    () => undefined,
  );

  assert.ok(nodeObject instanceof THREE.LineLoop);
  const border = nodeObject as THREE.LineLoop;
  const borderMaterial = border.material as THREE.LineBasicMaterial;
  assert.ok(borderMaterial.opacity < 0.9);
  assert.equal(borderMaterial.color.getHexString(), "94a3b8");
});

