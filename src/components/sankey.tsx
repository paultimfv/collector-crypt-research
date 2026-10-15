// Small dependency-free Sankey: nodes sit in columns, band width is proportional to value.
// Server-rendered SVG so it prints and reads without JavaScript.

export type SNode = { id: string; col: number; label: string; sub?: string; color: string; order?: number };
export type SLink = { from: string; to: string; value: number; color?: string };

export default function Sankey({ nodes, links, width = 1000, height = 420, cols = 4, labelW = 170, ariaLabel }: {
  nodes: SNode[]; links: SLink[]; width?: number; height?: number; cols?: number; labelW?: number; ariaLabel: string;
}) {
  const nodeW = 10;
  const padY = 16;
  const gap = 26;
  const usable = width - labelW;
  const colX = (c: number) => (c * (usable - nodeW)) / (cols - 1);
  const inSum = (id: string) => links.filter((l) => l.to === id).reduce((a, l) => a + l.value, 0);
  const outSum = (id: string) => links.filter((l) => l.from === id).reduce((a, l) => a + l.value, 0);
  const val = (id: string) => Math.max(inSum(id), outSum(id));

  // one scale for every column, set by the busiest column
  const byCol = Array.from({ length: cols }, (_, c) => nodes.filter((n) => n.col === c).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const k = Math.min(...byCol.filter((c) => c.length).map((c) => (height - padY * 2 - gap * (c.length - 1)) / c.reduce((a, n) => a + val(n.id), 0)));

  const pos: Record<string, { x: number; y: number; h: number }> = {};
  byCol.forEach((colNodes, c) => {
    const total = colNodes.reduce((a, n) => a + Math.max(val(n.id) * k, 2), 0) + gap * (colNodes.length - 1);
    let y = (height - total) / 2;
    colNodes.forEach((n) => {
      const h = Math.max(val(n.id) * k, 2);
      pos[n.id] = { x: colX(c), y, h };
      y += h + gap;
    });
  });

  const outOff: Record<string, number> = {};
  const inOff: Record<string, number> = {};
  const bands = links.map((l, i) => {
    const s = pos[l.from], t = pos[l.to];
    const w = Math.max(l.value * k, 1);
    const sy = s.y + (outOff[l.from] ?? 0) + w / 2;
    const ty = t.y + (inOff[l.to] ?? 0) + w / 2;
    outOff[l.from] = (outOff[l.from] ?? 0) + w;
    inOff[l.to] = (inOff[l.to] ?? 0) + w;
    const x0 = s.x + nodeW, x1 = t.x, mx = (x0 + x1) / 2;
    const color = l.color ?? nodes.find((n) => n.id === l.from)!.color;
    return <path key={i} d={`M${x0},${sy} C${mx},${sy} ${mx},${ty} ${x1},${ty}`} fill="none" stroke={color} strokeOpacity={0.32} strokeWidth={w} />;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[680px]" role="img" aria-label={ariaLabel}>
      {bands}
      {nodes.map((n) => {
        const p = pos[n.id];
        const last = n.col === cols - 1;
        const tx = last ? p.x + nodeW + 10 : p.x + nodeW + 8;
        const ty = p.y + p.h / 2;
        return (
          <g key={n.id}>
            <rect x={p.x} y={p.y} width={nodeW} height={p.h} fill={n.color} rx={1} />
            <text x={tx} y={n.sub ? ty - 7 : ty} fill="#ece6dc" fontSize={13} fontWeight={600} dominantBaseline="middle"
              style={{ paintOrder: "stroke", stroke: "var(--ink)", strokeWidth: 4, strokeLinejoin: "round" }}>{n.label}</text>
            {n.sub && (
              <text x={tx} y={ty + 10} fill="#8d8693" fontSize={11.5} dominantBaseline="middle"
                style={{ paintOrder: "stroke", stroke: "var(--ink)", strokeWidth: 4, strokeLinejoin: "round" }}>{n.sub}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
