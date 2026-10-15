// Collector Crypt contract map: where the money goes when a player opens a pack.
import { short } from "@/lib/fmt";

const sol = (a: string) => `https://solscan.io/account/${a}`;

type Kind = "program" | "wallet" | "mint" | "pool" | "evm";
type Box = { id: string; x: number; y: number; w: number; h: number; title: string; addr?: string; kind: Kind; lines?: string[] };

const BOXES: Box[] = [
  { id: "player", x: 20, y: 150, w: 170, h: 70, title: "Player", kind: "wallet", lines: ["via any storefront"] },
  { id: "fiat", x: 20, y: 300, w: 170, h: 58, title: "Card-payment rail", addr: "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s", kind: "wallet" },
  { id: "gacha", x: 290, y: 120, w: 230, h: 130, title: "Gacha wallet", addr: "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3", kind: "wallet",
    lines: ["USDC float  D9CE…zQZk", "holds the card NFTs", "signs every payout"] },
  { id: "vrf", x: 290, y: 20, w: 230, h: 58, title: "cc-vrf program", addr: "ccvrfu3fSpbnPLiUqdWAt85Zn9nq96ekwGTbHqGtdgQ", kind: "program" },
  { id: "ccbuy", x: 290, y: 300, w: 230, h: 58, title: "cc-buyback program", addr: "CcBuyM7sDhedBGLZxivBvgZVdqzrQAG66KYHgnTTEpLF", kind: "program" },
  { id: "bot", x: 620, y: 70, w: 220, h: 58, title: "CARDS buyback bot", addr: "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq", kind: "wallet" },
  { id: "pool", x: 620, y: 170, w: 220, h: 58, title: "Raydium CARDS/USDC", addr: "HnhpJPJgBG2KwniMTNW8cVBHvk1hFog3RC3kjnyc23tD", kind: "pool" },
  { id: "treasury", x: 620, y: 270, w: 220, h: 58, title: "Treasury (Squads)", addr: "3PnVBrb4wPLFLW38oaYR7dA6HSfKpawxHGESPj5kF1QB", kind: "wallet" },
  { id: "burn", x: 920, y: 50, w: 160, h: 58, title: "Burn wallet", addr: "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4", kind: "wallet" },
  { id: "mint", x: 920, y: 160, w: 160, h: 58, title: "CARDS mint", addr: "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp", kind: "mint" },
  { id: "evm", x: 920, y: 270, w: 160, h: 70, title: "EVM gacha", addr: "0x4d56B148624e17FD53c08D1C4998e8e3945bDE28", kind: "evm", lines: ["Base, Robinhood"] },
];

const EDGES: { from: string; to: string; label: string; fy?: number; ty?: number; color: string }[] = [
  { from: "player", to: "gacha", label: "USDC for a pack", fy: 0.3, ty: 0.35, color: "#4f8dff" },
  { from: "gacha", to: "player", label: "", fy: 0.75, ty: 0.75, color: "#ff7a2e" },
  { from: "fiat", to: "gacha", label: "bundled card sales", fy: 0.5, ty: 0.9, color: "#4f8dff" },
  { from: "gacha", to: "bot", label: "share of revenue", fy: 0.2, ty: 0.5, color: "#d9b45b" },
  { from: "bot", to: "pool", label: "buy CARDS", fy: 0.8, ty: 0.25, color: "#d9b45b" },
  { from: "pool", to: "treasury", label: "LP fees", fy: 0.8, ty: 0.25, color: "#8d93a0" },
  { from: "bot", to: "burn", label: "CARDS", fy: 0.3, ty: 0.5, color: "#d9b45b" },
];

export function ContractDiagram() {
  const by = Object.fromEntries(BOXES.map((b) => [b.id, b]));
  const color = (k: Kind) => (k === "program" ? "#4f8dff" : k === "mint" ? "#d9b45b" : k === "evm" ? "#c58cf0" : "#9aa0ac");
  return (
    <svg viewBox="0 0 1100 380" className="h-auto w-full min-w-[760px]" role="img"
      aria-label="Collector Crypt contract map: players and the card-payment rail pay the gacha wallet; the gacha wallet pays buybacks back to players and funds the CARDS buyback bot, which buys CARDS on Raydium and burns it">
      <defs>
        {["#4f8dff", "#ff7a2e", "#d9b45b", "#8d93a0", "#f2f0ea"].map((c) => (
          <marker key={c} id={`a${c.slice(1)}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={c} />
          </marker>
        ))}
      </defs>
      {EDGES.map((e, i) => {
        const a = by[e.from], b = by[e.to];
        const back = b.x < a.x;
        const x0 = back ? a.x : a.x + a.w, y0 = a.y + a.h * (e.fy ?? 0.5);
        const x1 = back ? b.x + b.w : b.x, y1 = b.y + b.h * (e.ty ?? 0.5);
        const mx = (x0 + x1) / 2;
        return (
          <g key={i}>
            <path d={`M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1 + (back ? 2 : -2)},${y1}`} fill="none" stroke={e.color} strokeOpacity={0.8} strokeWidth={1.3} markerEnd={`url(#a${e.color.slice(1)})`} />
            {e.label && <text x={mx} y={(y0 + y1) / 2 - 7} fill="#8d93a0" fontSize={11} textAnchor="middle" style={{ paintOrder: "stroke", stroke: "#0e1014", strokeWidth: 4 }}>{e.label}</text>}
          </g>
        );
      })}
      <text x={240} y={236} fill="#ff7a2e" fontSize={11} textAnchor="middle" style={{ paintOrder: "stroke", stroke: "#0e1014", strokeWidth: 4 }}>card NFT, then USDC if sold back</text>
      <path d="M1000,108 L1000,156" stroke="#f2f0ea" strokeOpacity={0.8} strokeWidth={1.3} markerEnd="url(#af2f0ea)" />
      <text x={1008} y={136} fill="#8d93a0" fontSize={11}>burn</text>
      <path d="M405,250 L405,298" stroke="#8d93a0" strokeOpacity={0.6} strokeDasharray="3 3" />
      <path d="M405,118 L405,80" stroke="#8d93a0" strokeOpacity={0.6} strokeDasharray="3 3" />
      <text x={413} y={100} fill="#8d93a0" fontSize={10.5}>proof per pack</text>
      <text x={413} y={280} fill="#8d93a0" fontSize={10.5}>third-party sell-backs</text>
      {BOXES.map((b) => (
        <a key={b.id} href={b.addr ? (b.kind === "evm" ? `https://basescan.org/address/${b.addr}` : sol(b.addr)) : undefined} target="_blank" rel="noreferrer">
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={b.id === "gacha" ? "#1c2029" : "#151820"} stroke={b.id === "gacha" ? "#4f8dff" : "#2a2f3a"} strokeWidth={b.id === "gacha" ? 1.4 : 1} />
          <text x={b.x + 12} y={b.y + 22} fill="#f2f0ea" fontSize={13.5} fontWeight={600}>{b.title}</text>
          {b.addr && <text x={b.x + 12} y={b.y + 40} fill={color(b.kind)} fontSize={11.5}>{short(b.addr)}</text>}
          {b.lines?.map((l, i) => <text key={l} x={b.x + 12} y={b.y + (b.addr ? 64 : 42) + i * 20} fill="#8d93a0" fontSize={11.5}>{l}</text>)}
        </a>
      ))}
    </svg>
  );
}

const ENTRIES: { name: string; addr: string; kind: Kind; role: string }[] = [
  { name: "Gacha wallet", addr: "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3", kind: "wallet", role: "Receives every pack payment, holds card NFTs, pays every buyback (since 7 Dec 2025)" },
  { name: "Gacha USDC account", addr: "D9CEogjHA6CpS12F8St9zpSco7pQKJB5uR1RqDsuzQZk", kind: "wallet", role: "The float; USDT, JupUSD and CASH lanes sit beside it" },
  { name: "Gacha wallet (old)", addr: "GachazZscHZ5bn3vnq1yEC4zpYdhAYJBzuKJwSJksc9z", kind: "wallet", role: "Same role until December 2025" },
  { name: "Card-payment rail", addr: "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s", kind: "wallet", role: "Card and Coinbase purchases settle here in bundles" },
  { name: "cc-vrf program", addr: "ccvrfu3fSpbnPLiUqdWAt85Zn9nq96ekwGTbHqGtdgQ", kind: "program", role: "Commits a VRF proof for each pack before it opens" },
  { name: "cc-buyback program", addr: "CcBuyM7sDhedBGLZxivBvgZVdqzrQAG66KYHgnTTEpLF", kind: "program", role: "Signed-quote sell-backs for third-party storefronts (since Sep 2026)" },
  { name: "CARDS mint", addr: "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp", kind: "mint", role: "2B fixed supply; only goes down, through burns" },
  { name: "CARDS buyback bot", addr: "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq", kind: "wallet", role: "Gets USDC from the gacha wallet and buys CARDS in small swaps (since Apr 2026)" },
  { name: "Burn wallet", addr: "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4", kind: "wallet", role: "Receives the bought CARDS and burns them in batches (found onchain)" },
  { name: "Raydium CARDS/USDC", addr: "HnhpJPJgBG2KwniMTNW8cVBHvk1hFog3RC3kjnyc23tD", kind: "pool", role: "Main CARDS market; the treasury is an LP" },
  { name: "Treasury (Squads)", addr: "3PnVBrb4wPLFLW38oaYR7dA6HSfKpawxHGESPj5kF1QB", kind: "wallet", role: "Squads multisig; liquidity provider in the CARDS/USDC pool" },
  { name: "Royalty collector", addr: "DQPERZ9e86pNJ4mhUnCEP8V75yxZofsipoVrRWT5Wdxd", kind: "wallet", role: "Marketplace royalties" },
  { name: "EVM gacha (Base, Robinhood)", addr: "0x4d56B148624e17FD53c08D1C4998e8e3945bDE28", kind: "evm", role: "Same machine on EVM: Paid and SoldBack events" },
];

export function ContractTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="text-mute">
          <tr className="border-b border-line"><th className="py-2 pr-4 font-normal">Name</th><th className="py-2 pr-4 font-normal">Address</th><th className="py-2 font-normal">What it does</th></tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.addr} className="border-b border-line/60 align-top">
              <td className="py-2 pr-4 whitespace-nowrap">{e.name}</td>
              <td className="py-2 pr-4">
                <a href={e.kind === "evm" ? `https://basescan.org/address/${e.addr}` : sol(e.addr)} target="_blank" rel="noreferrer" className="text-in underline">{short(e.addr)}</a>
              </td>
              <td className="py-2 text-mute">{e.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
