import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  applyNodeLabelSpriteColor,
  createNodeObject,
  formatNodeLabelText,
  getNodeLabelOffset,
  getNodeLabelStyle,
} from "@/components/productivity/productivity-graph-3d-rendering";

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

test("formats post labels with brackets", () => {
  assert.equal(formatNodeLabelText("category", "Engineering"), "Engineering");
  assert.equal(formatNodeLabelText("post", "Ship It"), "[Ship It]");
});

test("applies category and post label typography styles", () => {
  const categoryStyle = getNodeLabelStyle("category");
  const postStyle = getNodeLabelStyle("post");

  assert.equal(categoryStyle.fontWeight, "700");
  assert.equal(categoryStyle.fontStyle, "normal");
  assert.equal(categoryStyle.opacity, 1);

  assert.equal(postStyle.fontWeight, "400");
  assert.equal(postStyle.fontStyle, "italic");
  assert.equal(postStyle.opacity, 0.5);
});

test("supports theme-driven label color overrides", () => {
  const categoryStyle = getNodeLabelStyle("category", { categoryColor: "#e7e5e4" });
  const postStyle = getNodeLabelStyle("post", { postColor: "#a8a29e" });

  assert.equal(categoryStyle.color, "#e7e5e4");
  assert.equal(postStyle.color, "#a8a29e");
});

test("updates sprite material tint for theme changes", () => {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      color: "#ffffff",
      opacity: 0.5,
      transparent: true,
    }),
  );

  applyNodeLabelSpriteColor(sprite, "#111111", 0.8);
  const material = sprite.material as THREE.SpriteMaterial;
  assert.equal(material.color.getHexString(), "111111");
  assert.equal(material.opacity, 0.8);
});

test("positions category labels to the right and post labels below nodes", () => {
  const categoryOffset = getNodeLabelOffset("category", 10, 20, 5);
  const postOffset = getNodeLabelOffset("post", 8, 16, 4);

  assert.ok(categoryOffset.x > 0);
  assert.ok(categoryOffset.y >= 0);
  assert.ok(postOffset.y < 0);
  assert.equal(postOffset.x, 0);
});
