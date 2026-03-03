function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveTiltedCameraPosition(
  distance: number,
  elevationDegrees: number,
  azimuthDegrees: number,
) {
  const safeDistance = Math.max(1, distance);
  const elevation = clamp(elevationDegrees, -89, 89);
  const elevationRadians = degreesToRadians(elevation);
  const azimuthRadians = degreesToRadians(azimuthDegrees);
  const radialDistance = safeDistance * Math.cos(elevationRadians);

  return {
    x: radialDistance * Math.cos(azimuthRadians),
    y: radialDistance * Math.sin(azimuthRadians),
    z: safeDistance * Math.sin(elevationRadians),
  };
}

export function orbitPolarAngleFromElevation(elevationDegrees: number) {
  const elevation = clamp(elevationDegrees, -89, 89);
  return degreesToRadians(90 - elevation);
}

export function resolveLinkCurvature(linkId: string) {
  const hash = hashString(`${linkId}:curve`);
  return 0.13 + (hash % 6) * 0.025;
}

export function resolveLinkCurveRotation(linkId: string) {
  const hash = hashString(`${linkId}:rotation`);
  return degreesToRadians(hash % 360);
}
