// Geometry for <Diagram>: node boxes, orthogonal edge routing with rounded
// corners, and open chevron arrowheads — modeled on Meta paper figures.

export type Side = 'left' | 'right' | 'top' | 'bottom';
export type Point = [number, number];

export type Kind =
  | 'model' // teal: models / goals
  | 'engine' // yellow: data engines / core blocks
  | 'source' // purple: data sources
  | 'decoder' // blue
  | 'mesh' // green
  | 'splat' // peach
  | 'neutral' // blue-gray, e.g. final product
  | 'tag' // peach pill without stroke, e.g. "Human + SAM"
  | 'dark' // black pill, white text
  | 'go' // solid green, white text
  | 'gray' // light gray, no stroke
  | 'plain'; // white with gray stroke

export const PALETTE: Record<Kind, { fill: string; stroke: string; text: string }> = {
  model: { fill: '#c9e7e5', stroke: '#5cb3a9', text: '#1f1f1f' },
  engine: { fill: '#fff3ae', stroke: '#f3d24a', text: '#1f1f1f' },
  source: { fill: '#d3d0ec', stroke: '#8f87c7', text: '#1f1f1f' },
  decoder: { fill: '#cfe3f7', stroke: '#80b3e3', text: '#1f1f1f' },
  mesh: { fill: '#e3f2df', stroke: '#b3dba9', text: '#1f1f1f' },
  splat: { fill: '#fbe6dd', stroke: '#f1c4b0', text: '#1f1f1f' },
  neutral: { fill: '#e9eef3', stroke: '#a8b4c5', text: '#1f1f1f' },
  tag: { fill: '#fde4cd', stroke: 'none', text: '#1f1f1f' },
  dark: { fill: '#1d1d1f', stroke: 'none', text: '#ffffff' },
  go: { fill: '#4caf50', stroke: 'none', text: '#ffffff' },
  gray: { fill: '#f2f2f2', stroke: 'none', text: '#1f1f1f' },
  plain: { fill: '#ffffff', stroke: '#c9ccd1', text: '#1f1f1f' },
};

export interface DiagramNode {
  id?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Use "\n" for line breaks. */
  label?: string;
  kind?: Kind;
  /** box (default) · pill · trapezoid · tokens · image · text (label only, anchored at x,y) */
  shape?: 'box' | 'pill' | 'trapezoid' | 'tokens' | 'image' | 'text';
  /** tokens: number of squares */
  count?: number;
  /** image: path under public/ or absolute URL */
  src?: string;
  /** trapezoid: narrow side on the right instead of the left */
  flip?: boolean;
  /** text: anchor */
  align?: 'start' | 'middle' | 'end';
  size?: number;
  weight?: number;
  italic?: boolean;
  color?: string;
}

export interface DiagramEdge {
  from: string | Point;
  to: string | Point;
  fromSide?: Side;
  toSide?: Side;
  /** Position along the side, 0–1 (default 0.5). */
  fromAt?: number;
  toAt?: number;
  /** Explicit waypoints between the endpoints. */
  via?: Point[];
  /** Coordinate of the middle bend for S-shaped routes. */
  mid?: number;
  label?: string;
  /** Position of the label along the path, 0–1 (default 0.5). */
  labelAt?: number;
  dashed?: boolean;
  arrow?: boolean;
  /** With <Diagram animate>: when a token travels this edge (edges sharing a step move together). Defaults to the edge's index. */
  step?: number;
  /** With <Diagram animate>: no token on this edge (e.g. a long annotation line). */
  still?: boolean;
}

export interface DiagramGroup {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  /** top: centered above ("STAGE 1") · bracket: bottom-left inside ("[ GEOMETRY MODEL ]") */
  labelPos?: 'top' | 'bracket';
  variant?: 'dashed' | 'filled';
  /** Draw this many faded copies behind, offset up and to the right, to show N instances. */
  stack?: number;
}

export interface LegendItem {
  kind: Kind | 'group';
  label: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TOKEN_GAP = 7;

export function nodeBox(n: DiagramNode): Box {
  if (n.shape === 'text') return { x: n.x, y: n.y, w: 0, h: 0 };
  const h = n.h ?? (n.shape === 'tokens' ? 24 : n.shape === 'pill' && n.kind === 'tag' ? 30 : 56);
  const w = n.shape === 'tokens' ? (n.count ?? 3) * h + ((n.count ?? 3) - 1) * TOKEN_GAP : (n.w ?? 180);
  return { x: n.x, y: n.y, w, h };
}

export function tokenRects(n: DiagramNode): Box[] {
  const { x, y, h } = nodeBox(n);
  return Array.from({ length: n.count ?? 3 }, (_, i) => ({ x: x + i * (h + TOKEN_GAP), y, w: h, h }));
}

export function trapezoidPoints(n: DiagramNode): string {
  const { x, y, w, h } = nodeBox(n);
  const inset = h * 0.13;
  const pts: Point[] = n.flip
    ? [[x, y], [x + w, y + inset], [x + w, y + h - inset], [x, y + h]]
    : [[x, y + inset], [x + w, y], [x + w, y + h], [x, y + h - inset]];
  return pts.map((p) => p.join(',')).join(' ');
}

const horizontal = (s: Side) => s === 'left' || s === 'right';

function autoSides(a: Box, b: Box): [Side, Side] {
  if (b.x >= a.x + a.w - 1) return ['right', 'left'];
  if (b.x + b.w <= a.x + 1) return ['left', 'right'];
  return b.y >= a.y + a.h ? ['bottom', 'top'] : ['top', 'bottom'];
}

function anchor(b: Box, side: Side, at = 0.5): Point {
  switch (side) {
    case 'left':
      return [b.x, b.y + b.h * at];
    case 'right':
      return [b.x + b.w, b.y + b.h * at];
    case 'top':
      return [b.x + b.w * at, b.y];
    case 'bottom':
      return [b.x + b.w * at, b.y + b.h];
  }
}

const OUTWARD: Record<Side, Point> = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

export interface RoutedEdge {
  d: string;
  arrow?: string;
  label?: { x: number; y: number; text: string };
  dashed: boolean;
  /** Path length in viewBox units (for constant-speed animation). */
  length: number;
}

export function routeEdge(e: DiagramEdge, nodes: Map<string, DiagramNode>): RoutedEdge {
  const resolve = (end: string | Point): { box: Box; isPoint: boolean } => {
    if (Array.isArray(end)) return { box: { x: end[0], y: end[1], w: 0, h: 0 }, isPoint: true };
    const n = nodes.get(end);
    if (!n) throw new Error(`Diagram: unknown node id "${end}"`);
    return { box: nodeBox(n), isPoint: false };
  };
  const a = resolve(e.from);
  const b = resolve(e.to);
  const [autoFrom, autoTo] = autoSides(a.box, b.box);
  const fromSide = e.fromSide ?? autoFrom;
  const toSide = e.toSide ?? autoTo;

  // Leave a small gap between arrows and the boxes they connect.
  const GAP = 7;
  let S = anchor(a.box, fromSide, e.fromAt);
  let E = anchor(b.box, toSide, e.toAt);
  if (!a.isPoint) S = [S[0] + OUTWARD[fromSide][0] * GAP, S[1] + OUTWARD[fromSide][1] * GAP];
  if (!b.isPoint) E = [E[0] + OUTWARD[toSide][0] * GAP, E[1] + OUTWARD[toSide][1] * GAP];

  let pts: Point[];
  if (e.via) {
    pts = [S, ...e.via, E];
  } else if (horizontal(fromSide) && horizontal(toSide)) {
    const m = e.mid ?? (S[0] + E[0]) / 2;
    pts = Math.abs(S[1] - E[1]) < 0.5 ? [S, E] : [S, [m, S[1]], [m, E[1]], E];
  } else if (!horizontal(fromSide) && !horizontal(toSide)) {
    const m = e.mid ?? (S[1] + E[1]) / 2;
    pts = Math.abs(S[0] - E[0]) < 0.5 ? [S, E] : [S, [S[0], m], [E[0], m], E];
  } else if (horizontal(fromSide)) {
    pts = [S, [E[0], S[1]], E];
  } else {
    pts = [S, [S[0], E[1]], E];
  }

  const RADIUS = 18;
  const fmt = (p: Point) => `${+p[0].toFixed(2)},${+p[1].toFixed(2)}`;
  let d = `M${fmt(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [p, c, n] = [pts[i - 1], pts[i], pts[i + 1]];
    const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const l2 = Math.hypot(n[0] - c[0], n[1] - c[1]);
    const r = Math.min(RADIUS, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L${fmt(c)}`;
      continue;
    }
    const p1: Point = [c[0] - ((c[0] - p[0]) / l1) * r, c[1] - ((c[1] - p[1]) / l1) * r];
    const p2: Point = [c[0] + ((n[0] - c[0]) / l2) * r, c[1] + ((n[1] - c[1]) / l2) * r];
    d += ` L${fmt(p1)} Q${fmt(c)} ${fmt(p2)}`;
  }
  d += ` L${fmt(pts[pts.length - 1])}`;

  let arrow: string | undefined;
  if (e.arrow !== false) {
    const [p, t] = [pts[pts.length - 2], pts[pts.length - 1]];
    const len = Math.hypot(t[0] - p[0], t[1] - p[1]) || 1;
    const u: Point = [(t[0] - p[0]) / len, (t[1] - p[1]) / len];
    const back: Point = [t[0] - u[0] * 10, t[1] - u[1] * 10];
    const wing: Point = [-u[1] * 8, u[0] * 8];
    arrow = `M${fmt([back[0] + wing[0], back[1] + wing[1]])} L${fmt(t)} L${fmt([back[0] - wing[0], back[1] - wing[1]])}`;
  }

  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let label: RoutedEdge['label'];
  if (e.label) {
    let target = lens.reduce((s, l) => s + l, 0) * (e.labelAt ?? 0.5);
    let i = 0;
    while (i < lens.length - 1 && target > lens[i]) target -= lens[i++];
    const t = lens[i] ? target / lens[i] : 0;
    label = {
      x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
      y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
      text: e.label,
    };
  }

  return { d, arrow, label, dashed: !!e.dashed, length: lens.reduce((s, l) => s + l, 0) };
}
