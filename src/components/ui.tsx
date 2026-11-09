// Dashboard building blocks, shared by the ORE and Collector Crypt dashboards. Structure only; each site's globals.css gives them its look.

export function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">{value}</div>
      {note && <div className="kpi-n">{note}</div>}
    </div>
  );
}

export function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="sec mt-16">
      <header className="sec-h">
        <h2 className="sec-t">{title}</h2>
        {sub && <p className="sec-l">{sub}</p>}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export type Src = { label: string; href: string };

export function Panel({ title, sub, source, children }: { title: string; sub?: string; source?: Src[]; children: React.ReactNode }) {
  return (
    <figure className="fig">
      <figcaption className="fig-h"><span className="fig-t">{title}</span>{sub && <span className="fig-s">{sub}</span>}</figcaption>
      {children}
      {source && (
        <div className="mt-2 text-[12px] text-muted">
          Source:{" "}
          {source.map((s, i) => <span key={s.href}>{i > 0 && ", "}<a className="underline decoration-line underline-offset-2 hover:text-text" href={s.href} target="_blank" rel="noreferrer">{s.label}</a></span>)}
        </div>
      )}
    </figure>
  );
}

export type Addr = { name: string; addr: string; role: string; href?: string };

export function AddressTable({ rows }: { rows: Addr[] }) {
  return (
    <div className="fig overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="text-muted">
          <tr className="border-b border-text"><th className="py-2 pr-4 text-[12.5px] font-medium">Name</th><th className="py-2 pr-4 text-[12.5px] font-medium">Address</th><th className="py-2 text-[12.5px] font-medium">What it does</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.addr} className="border-t border-line align-top">
              <td className="py-2 pr-4 whitespace-nowrap text-text">{r.name}</td>
              <td className="py-2 pr-4"><a className="text-accent underline" href={r.href ?? `https://solscan.io/account/${r.addr}`} target="_blank" rel="noreferrer">{r.addr.slice(0, 4)}…{r.addr.slice(-4)}</a></td>
              <td className="py-2 text-muted">{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Simple boxes-and-arrows money map. Boxes sit on a grid (col, row); each arrow carries a label.
export type FNode = { id: string; col: number; row: number; title: string; sub?: string; addr?: string; kind?: "contract" | "wallet" | "outcome" };
export type FEdge = { from: string; to: string; label: string };

export function FlowMap({ nodes, edges, cols, rows, ariaLabel }: { nodes: FNode[]; edges: FEdge[]; cols: number; rows: number; ariaLabel: string }) {
  const W = 190, H = 64, GX = 120, GY = 34, PAD = 10;
  const width = cols * W + (cols - 1) * GX + PAD * 2;
  const height = rows * H + (rows - 1) * GY + PAD * 2;
  const pos = Object.fromEntries(nodes.map((n) => [n.id, { x: PAD + n.col * (W + GX), y: PAD + n.row * (H + GY) }]));
  return (
    <div className="overflow-x-auto rounded-[3px] bg-panel p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" style={{ minWidth: Math.min(width, 900) * 0.8 }} role="img" aria-label={ariaLabel}>
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          let x1, y1, x2, y2;
          if (a.x === b.x) { // same column: vertical
            x1 = x2 = a.x + W / 2;
            [y1, y2] = a.y < b.y ? [a.y + H, b.y] : [a.y, b.y + H];
          } else if (a.x < b.x) { x1 = a.x + W; y1 = a.y + H / 2; x2 = b.x; y2 = b.y + H / 2; }
          else { x1 = a.x; y1 = a.y + H / 2; x2 = b.x + W; y2 = b.y + H / 2; }
          const mx = (x1 + x2) / 2;
          const d = a.x === b.x ? `M${x1},${y1} L${x2},${y2 + (y2 > y1 ? -2 : 2)}` : `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2 + (x2 > x1 ? -2 : 2)},${y2}`;
          // label on the final segment, next to the box it points at; when several arrows meet at one
          // box, label each on its first segment instead so they don't stack up
          const merging = edges.filter((o) => o.to === e.to).length > 1;
          const lx = a.x === b.x ? x1 + 8 : merging ? x1 + 6 : x2 - 8;
          const ly = a.x === b.x ? (y1 + y2) / 2 + 4 : merging ? y1 - 7 : y2 - 7;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.3} markerEnd="url(#arrow)" />
              <text x={lx} y={ly} fontSize={12} fill="var(--text)" textAnchor={a.x === b.x || merging ? "start" : "end"}
                style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 5, strokeLinejoin: "round" }}>{e.label}</text>
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos[n.id];
          const outcome = n.kind === "outcome";
          return (
            <a key={n.id} href={n.addr ? `https://solscan.io/account/${n.addr}` : undefined} target="_blank" rel="noreferrer">
              <rect x={p.x} y={p.y} width={W} height={H} rx={8} fill={outcome ? "transparent" : "var(--bg)"}
                stroke={n.kind === "contract" ? "var(--accent)" : "var(--line)"} strokeWidth={n.kind === "contract" ? 1.5 : 1} strokeDasharray={outcome ? "4 3" : undefined} />
              <text x={p.x + 12} y={p.y + 25} fontSize={14} fontWeight={600} fill="var(--text)">{n.title}</text>
              {n.sub && <text x={p.x + 12} y={p.y + 45} fontSize={12} fill="var(--muted)">{n.sub}</text>}
            </a>
          );
        })}
      </svg>
    </div>
  );
}

export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-2 text-[14.5px] leading-relaxed text-text">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raise text-[12px] text-muted">{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

export function BarList({ rows, fmt }: { rows: { label: string; value: number }[]; fmt: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[120px_1fr_80px] items-center gap-3 text-[14px]">
          <span className="truncate text-text">{r.label}</span>
          <span className="h-3 bg-raise"><span className="block h-3 bg-accent" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="num text-right text-text">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
