// number formatting shared by server and client components

export const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
export const n1 = (x: number) => x.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const n2 = (x: number) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

export function usd(x: number, d?: number) {
  const a = Math.abs(x);
  if (a >= 1e9) return `$${(x / 1e9).toFixed(d ?? 2)}B`;
  if (a >= 1e6) return `$${(x / 1e6).toFixed(d ?? 1)}M`;
  if (a >= 1e4) return `$${(x / 1e3).toFixed(d ?? 0)}K`;
  return `$${x.toLocaleString("en-US", { maximumFractionDigits: d ?? 2 })}`;
}

export function compact(x: number, d = 1) {
  const a = Math.abs(x);
  if (a >= 1e6) return `${(x / 1e6).toFixed(d)}M`;
  if (a >= 1e3) return `${(x / 1e3).toFixed(a >= 1e5 ? 0 : d)}K`;
  return x.toFixed(0);
}

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export const month = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
export const dayLabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
