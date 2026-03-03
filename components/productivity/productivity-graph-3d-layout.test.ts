import assert from "node:assert/strict";
import test from "node:test";
import {
  orbitPolarAngleFromElevation,
  resolveLinkCurveRotation,
  resolveLinkCurvature,
  resolveTiltedCameraPosition,
} from "@/components/productivity/productivity-graph-3d-layout";

test("resolveTiltedCameraPosition keeps the requested camera distance", () => {
  const position = resolveTiltedCameraPosition(500, 35, -28);
  const distance = Math.hypot(position.x, position.y, position.z);

  assert.ok(Math.abs(distance - 500) < 0.0001);
  assert.ok(position.z > 0);
});

test("orbitPolarAngleFromElevation maps degrees to radians around the graph plane", () => {
  const angle = orbitPolarAngleFromElevation(35);
  const expected = ((90 - 35) * Math.PI) / 180;

  assert.ok(Math.abs(angle - expected) < 0.0001);
});

test("link curvature is deterministic and bounded", () => {
  const edgeA = "edge:post:one->cat:ops";
  const edgeB = "edge:post:two->cat:infra";
  const curveA = resolveLinkCurvature(edgeA);
  const curveARepeat = resolveLinkCurvature(edgeA);
  const curveB = resolveLinkCurvature(edgeB);

  assert.equal(curveA, curveARepeat);
  assert.ok(curveA >= 0.13 && curveA <= 0.255);
  assert.ok(curveB >= 0.13 && curveB <= 0.255);
  assert.notEqual(curveA, curveB);
});

test("link curve rotation is deterministic", () => {
  const edge = "edge:post:one->cat:ops";
  const rotation = resolveLinkCurveRotation(edge);
  const repeatedRotation = resolveLinkCurveRotation(edge);

  assert.equal(rotation, repeatedRotation);
  assert.ok(rotation >= 0 && rotation <= Math.PI * 2);
});
