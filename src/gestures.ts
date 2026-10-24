// One turn opens a valve fully. Unwrap angles at +/-pi so crossing the seam
// cannot fling a valve from fully open to shut.
export function wheelDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from)) / (2 * Math.PI);
}
export function leverValue(start: number, downY: number, y: number) {
  return Math.max(0, Math.min(1, start + (downY - y) / 110));
}
export function controlPose(kind: string, value: number) {
  return kind === "wheel" ? -value * Math.PI * 2 : 0.65 - value * 1.3;
}
