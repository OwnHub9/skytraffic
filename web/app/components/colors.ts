function mix(from: number[], to: number[], t: number) {
  const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const clamp = (t: number) => Math.min(1, Math.max(0, t));

// Grey-blue (on time) → red (late), for map bubbles and arcs
export function bubbleColor(rate: number, lo = 14, hi = 32) {
  return mix([96, 112, 138], [255, 77, 99], clamp((rate - lo) / (hi - lo)));
}

// Dark navy → red, for heatmap cells
export function heatColor(rate: number, lo = 8, hi = 36) {
  return mix([22, 32, 50], [255, 77, 99], clamp((rate - lo) / (hi - lo)));
}