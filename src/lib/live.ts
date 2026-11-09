// Live Collector Crypt state, read on the server and cached for 60 seconds (page revalidate = 60):
// CARDS supply (→ burned), the gacha USDC float, gacha transactions in the last hour (Solana RPC) and the CARDS
// market price (Jupiter's free price API). Alchemy when ALCHEMY_KEY is set on Vercel, else the public Solana RPC.
// A few calls a minute, well inside free tiers. Any failure falls back to the hourly snapshot.
import type { CardsData } from "@/lib/data";

const RPC = process.env.SOLANA_RPC_URL
  ?? (process.env.ALCHEMY_KEY ? `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}` : "https://api.mainnet-beta.solana.com");
const CARDS = "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp";
const GACHA_USDC_ACCOUNT = "D9CEogjHA6CpS12F8St9zpSco7pQKJB5uR1RqDsuzQZk";
const MAX_SUPPLY = 2_000_000_000;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  for (let i = 0; ; i++) {   // free tiers rate-limit bursts: retry 429s a few times with a short backoff
    const r = await fetch(RPC, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), next: { revalidate: 60 }, signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429 && i < 4) { await new Promise((ok) => setTimeout(ok, 400 * (i + 1))); continue; }
    const j = await r.json();
    if (j.error) throw new Error(JSON.stringify(j.error));
    return j.result as T;
  }
}

export type Live = CardsData["live"] & { at: string; fresh: boolean; marketPrice: number | null; txLastHour: number | null };

export async function liveCards(snapshot: CardsData["live"], snapshotAt: string): Promise<Live> {
  const base: Live = { ...snapshot, at: snapshotAt, fresh: false, marketPrice: null, txLastHour: null };
  try {
    const px = await fetch(`https://lite-api.jup.ag/price/v3?ids=${CARDS}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(6000) })
      .then((r) => r.json()).then((j) => Number(j?.[CARDS]?.usdPrice) || null).catch(() => null);
    base.marketPrice = px;
    const mint = await rpc<{ value: { data: { parsed: { info: { supply: string } } } } }>("getAccountInfo", [CARDS, { encoding: "jsonParsed" }]);
    const float = await rpc<{ value: { uiAmountString: string } }>("getTokenAccountBalance", [GACHA_USDC_ACCOUNT]);
    const sigs = await rpc<{ blockTime: number | null; err: unknown }[]>("getSignaturesForAddress", [GACHA_USDC_ACCOUNT, { limit: 1000 }]);
    const hourAgo = Date.now() / 1000 - 3600;
    const supply = Number(mint.value.data.parsed.info.supply) / 1e6;
    return {
      ...base,
      supply: Math.round(supply), burnedBySupply: Math.round(MAX_SUPPLY - supply), gachaFloat: Math.round(Number(float.value.uiAmountString)),
      txLastHour: sigs.filter((s) => !s.err && (s.blockTime ?? 0) >= hourAgo).length,
      at: new Date().toISOString(), fresh: true,
    };
  } catch (e) {
    console.warn("liveCards: falling back to the hourly snapshot:", String(e).replace(RPC, "<rpc>").slice(0, 300));
    return base;
  }
}
