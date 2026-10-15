"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const C = { in: "#4f8dff", out: "#ff7a2e", paper: "#f2f0ea", mute: "#8d93a0", line: "#2a2f3a", gold: "#d9b45b" };
const STORE_COLORS = ["#4f8dff", "#9bb8ff", "#d9b45b", "#5fc3a8", "#c58cf0", "#8d93a0"];
const axis = { stroke: C.mute, fontSize: 11, tickLine: false, axisLine: false } as const;

type Row = Record<string, number | string | null>;

const mlabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dlabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const usdK = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}K` : `${Math.round(a)}`;
  return `${v < 0 ? "−" : ""}$${s}`;
};
const usdFull = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;

type Item = { key: string; name: string; color: string; fmt: (v: number) => string };

function Tip({ active, payload, label, items }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; items: Item[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[4px] border border-line bg-raise px-3 py-2 text-[12.5px] shadow-xl">
      <div className="mb-1 text-mute">{label ? dlabel(label) : ""}</div>
      {items.map((it) => {
        const p = payload.find((x) => x.dataKey === it.key);
        if (!p || p.value == null) return null;
        return (
          <div key={it.key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: it.color }} />{it.name}</span>
            <span className="font-semibold text-paper">{it.fmt(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

// inside the slab: daily pack sales and buybacks, last 90 days
export function SlabSpark({ rows }: { rows: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.in} stopOpacity={0.5} /><stop offset="100%" stopColor={C.in} stopOpacity={0} /></linearGradient>
          <linearGradient id="sOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.out} stopOpacity={0.45} /><stop offset="100%" stopColor={C.out} stopOpacity={0} /></linearGradient>
        </defs>
        <XAxis dataKey="d" hide />
        <YAxis hide domain={[0, "dataMax"]} />
        <Area dataKey="sales" stroke={C.in} strokeWidth={1.4} fill="url(#sIn)" isAnimationActive={false} />
        <Area dataKey="buybacks" stroke={C.out} strokeWidth={1.4} fill="url(#sOut)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// weekly pack sales (up) vs buybacks paid to players (down), with what the machine kept
export function SalesVsBuybacks({ rows }: { rows: Row[] }) {
  const items: Item[] = [
    { key: "sales", name: "Pack sales", color: C.in, fmt: usdFull },
    { key: "buybacksNeg", name: "Buybacks paid", color: C.out, fmt: usdFull },
    { key: "net", name: "Kept", color: C.paper, fmt: usdFull },
  ];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={rows} stackOffset="sign" margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="w" {...axis} tickFormatter={mlabel} minTickGap={40} />
        <YAxis {...axis} tickFormatter={usdK} width={52} />
        <ReferenceLine y={0} stroke={C.mute} strokeOpacity={0.6} />
        <Tooltip content={<Tip items={items} />} cursor={{ fill: C.paper, fillOpacity: 0.04 }} />
        <Bar dataKey="sales" stackId="s" fill={C.in} isAnimationActive={false} />
        <Bar dataKey="buybacksNeg" stackId="s" fill={C.out} isAnimationActive={false} />
        <Line dataKey="net" stroke={C.paper} strokeWidth={1.6} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// share of pack money paid straight back out
export function PayoutRatio({ rows }: { rows: Row[] }) {
  const items: Item[] = [{ key: "ratio", name: "Paid back", color: C.out, fmt: (v) => `${(v * 100).toFixed(1)}%` }];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="w" {...axis} tickFormatter={mlabel} minTickGap={40} />
        <YAxis {...axis} width={44} domain={[0.5, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
        <Tooltip content={<Tip items={items} />} cursor={{ stroke: C.mute, strokeOpacity: 0.4 }} />
        <Line dataKey="ratio" stroke={C.out} strokeWidth={1.8} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// weekly pack sales by storefront
export function StoreStack({ rows, stores, labels }: { rows: Row[]; stores: string[]; labels: Record<string, string> }) {
  const items: Item[] = stores.map((s, i) => ({ key: s, name: labels[s] ?? s, color: STORE_COLORS[i % STORE_COLORS.length], fmt: usdFull }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="w" {...axis} tickFormatter={mlabel} minTickGap={40} />
        <YAxis {...axis} tickFormatter={usdK} width={52} />
        <Tooltip content={<Tip items={[...items].reverse()} />} cursor={{ fill: C.paper, fillOpacity: 0.04 }} />
        {stores.map((s, i) => <Bar key={s} dataKey={s} stackId="st" fill={STORE_COLORS[i % STORE_COLORS.length]} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

// weekly USDC spent buying CARDS, with cumulative CARDS burned
export function TokenChart({ rows }: { rows: Row[] }) {
  const items: Item[] = [
    { key: "cardsBoughtUsd", name: "USDC spent on CARDS", color: C.gold, fmt: usdFull },
    { key: "cumBurned", name: "CARDS burned to date", color: C.paper, fmt: (v) => `${(v / 1e6).toFixed(2)}M` },
  ];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="w" {...axis} tickFormatter={mlabel} minTickGap={40} />
        <YAxis yAxisId="l" {...axis} tickFormatter={usdK} width={52} />
        <YAxis yAxisId="r" orientation="right" {...axis} width={44} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
        <Tooltip content={<Tip items={items} />} cursor={{ fill: C.paper, fillOpacity: 0.04 }} />
        <Bar yAxisId="l" dataKey="cardsBoughtUsd" fill={C.gold} isAnimationActive={false} />
        <Line yAxisId="r" dataKey="cumBurned" stroke={C.paper} strokeWidth={1.6} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
