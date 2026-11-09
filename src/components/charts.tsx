"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = Record<string, number | string | null>;
export type Series = { key: string; name: string; color: string; type: "bar" | "line"; stack?: string };

const short = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(0)}K`;
  if (a === 0) return "0";
  return `${s}${a.toFixed(a < 10 ? 2 : 0)}`;
};
const dateLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

// One time-series chart: bars and/or lines over dates in the "d" key.
export function TimeChart({ rows, series, unit = "", height = 260, prefix = "" }: {
  rows: Row[]; series: Series[]; unit?: string; height?: number; prefix?: string;
}) {
  const days = rows.length > 1 ? (Date.parse(String(rows[rows.length - 1].d)) - Date.parse(String(rows[0].d))) / 864e5 : 0;
  const tick = days > 120 ? monthLabel : dateLabel;
  const fmtFull = (v: number) => `${prefix}${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: Math.abs(v) < 10 ? 2 : 0 })}${unit ? " " + unit : ""}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} stackOffset="sign" margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="1 3" vertical={false} />
        <XAxis dataKey="d" stroke="var(--muted)" fontSize={11.5} fontFamily="var(--font-num)" tickLine={false} axisLine={{ stroke: "var(--text)" }} tickFormatter={tick} minTickGap={50} />
        <YAxis orientation="right" stroke="var(--muted)" fontSize={11.5} fontFamily="var(--font-num)" tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `${prefix}${short(v)}`} />
        <ReferenceLine y={0} stroke="var(--line)" />
        <Tooltip
          cursor={{ fill: "var(--text)", fillOpacity: 0.06 }}
          contentStyle={{ background: "var(--text)", border: 0, borderRadius: 2, fontSize: 12.5, fontFamily: "var(--font-num)", color: "var(--bg)" }}
          labelStyle={{ color: "var(--bg)", fontWeight: 600 }} itemStyle={{ color: "var(--bg)", padding: 0 }}
          labelFormatter={(l) => new Date(String(l) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
          formatter={(v, name) => [fmtFull(Number(v)), name]}
        />
        <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12.5, paddingBottom: 10 }} iconType="rect" iconSize={10} />
        {series.map((s) =>
          s.type === "bar"
            ? <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={s.stack} isAnimationActive={false} />
            : <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={1.8} dot={false} isAnimationActive={false} connectNulls />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
