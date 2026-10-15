import data from "@/data/cards.json";
import Slab from "@/components/slab";
import Sankey from "@/components/sankey";
import { PayoutRatio, SalesVsBuybacks, SlabSpark, StoreStack, TokenChart } from "@/components/charts";
import { ContractDiagram, ContractTable } from "@/components/contract-map";
import { n0, pct, usd, compact, dayLabel } from "@/lib/fmt";

const T = data.totals;
const L = data.live;
const M = data.last30;
const Q = data.concentration;
const cov = data.coverage;

const STORE_LABELS: Record<string, string> = {
  cc: "Collector Crypt", jupiter: "Jupiter", slabz: "Slabz", sol: "sol", arena: "Arena", comic: "Comic",
  direct: "No memo", watch: "watch", dcc: "dcc", fact: "fact", shift: "shift",
};
const storeName = (s: string) => STORE_LABELS[s] ?? s;

// days inside the exact-coverage window, today excluded (partial)
const inCov = data.daily.filter((d) => cov.from && d.d >= cov.from && d.d < (cov.to ?? ""));
type Wk = { w: string; sales: number; buybacks: number; net: number; cardsBoughtUsd?: number; cardsBurned?: number } & Record<string, number | string | undefined>;
const WEEKLY = data.weekly as unknown as Wk[];
// weekly once there's enough history, daily until then; charts read the x key "w" either way
const DAILY_AS_W = data.daily.filter((d) => cov.from && d.d >= cov.from && d.d < (cov.to ?? "")).map((d) => ({ ...d, w: d.d, ...Object.fromEntries(Object.entries(d.stores).map(([k, v]) => ["st_" + k, v])) })) as unknown as Wk[];
const weekly = cov.days >= 70;
const weeks = weekly ? WEEKLY.filter((w) => cov.from && w.w >= cov.from) : DAILY_AS_W;
const per = weekly ? "week" : "day";
const win = M.days >= 30 ? "30 days" : `${M.days} days`;
const winShort = M.days >= 30 ? "30d" : `${M.days}d`;
const kept = T.sales - T.buybacks;
const otherKept = Math.max(kept - T.toCardsBuyback - Math.max(T.teamOut - T.teamIn, 0), 0);
const topStores = data.stores.slice(0, 5).map((s) => s.store);
const storeRows = weeks.map((w) => {
  const row: Record<string, number | string> = { w: w.w };
  let other = 0;
  for (const k of Object.keys(w)) if (k.startsWith("st_")) {
    const s = k.slice(3);
    const v = Number(w[k] ?? 0);
    if (topStores.includes(s)) row[s] = v; else other += v;
  }
  row.other = other;
  return row;
});
const cumBurn = (() => {
  let c = 0;
  return WEEKLY.map((w) => { c += w.cardsBurned ?? 0; return { w: w.w, cardsBoughtUsd: w.cardsBoughtUsd ?? 0, cumBurned: c }; });
})();
const tokenRows = cumBurn.filter((w) => w.w >= "2026-04-13");
const maxTier = Math.max(...data.tiers.map((t) => t.sales));
const evmSales = data.evm.base.sales + data.evm.robinhood.sales;

const SECTIONS = [
  ["flow", "Flow"], ["sales", "Sales"], ["stores", "Storefronts"], ["packs", "Packs"],
  ["whales", "Whales"], ["token", "CARDS"], ["contracts", "Contracts"], ["method", "Method"],
] as const;

function Exhibit({ id, n, title, children, note, source }: {
  id: string; n: number; title: string; children: React.ReactNode; note?: React.ReactNode; source: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line pt-8 pb-14">
      <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[220px_1fr]">
        <div className="text-[14px] leading-relaxed text-mute">
          <div className="cond mb-2 text-[15px] font-semibold text-in">Exhibit {n}</div>
          {note}
        </div>
        <div className="min-w-0">
          <h2 className="cond mb-6 max-w-[30ch] text-[28px] leading-[1.08] font-semibold text-paper sm:text-[34px]">{title}</h2>
          {children}
          <p className="mt-4 text-[12.5px] leading-relaxed text-mute">Source: {source}</p>
        </div>
      </div>
    </section>
  );
}

function Fig({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "in" | "out" }) {
  return (
    <div className="border-t border-line py-3">
      <div className="text-[14px] text-mute">{label}</div>
      <div className={`cond mt-0.5 text-[34px] leading-none font-semibold ${tone === "in" ? "text-in" : tone === "out" ? "text-out" : "text-paper"}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[13px] text-mute">{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, right, color = "var(--in)" }: { label: string; value: number; max: number; right: string; color?: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3 py-1.5 text-[14px]">
      <span className="truncate text-paper">{label}</span>
      <span className="h-3 rounded-[2px] bg-raise"><span className="block h-3 rounded-[2px]" style={{ width: `${(value / max) * 100}%`, background: color }} /></span>
      <span className="cond w-[96px] text-right text-[15px] text-paper">{right}</span>
    </div>
  );
}

const sol = (a: string) => `https://solscan.io/account/${a}`;

export default function Page() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3 sm:px-6">
          <a href="#top" className="cond shrink-0 text-[18px] font-bold tracking-wide text-paper no-underline">Collector Crypt <span className="font-medium text-mute">research</span></a>
          <nav className="hidden flex-1 gap-5 text-[14px] text-mute lg:flex">
            {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="no-underline hover:text-paper">{label}</a>)}
          </nav>
          <div className="ml-auto shrink-0 text-right text-[12.5px] text-mute">Data to {dayLabel(cov.to ?? data.generatedAt.slice(0, 10))}</div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="grid items-center gap-10 pt-12 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <h1 className="cond text-[46px] leading-[0.98] font-bold text-paper sm:text-[64px]">
              Players paid {usd(M.sales)} for card packs in {win} and took {usd(M.buybacks)} back by selling the cards to the machine.
            </h1>
            <p className="mt-6 max-w-[60ch] text-[17px] leading-relaxed text-paper/80">
              Collector Crypt runs gacha machines for graded trading cards. A player pays USDC, a verifiable random draw
              picks a real PSA-graded card held in a vault, and the card arrives as an NFT. Most players take the instant
              buyback offer instead of keeping it. What the machine keeps funds the business and buys back the CARDS token.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-8">
              <Fig label={`Pack sales, ${winShort}`} value={usd(M.sales)} sub={`${n0(M.packs)} packs`} tone="in" />
              <Fig label={`Buybacks paid, ${winShort}`} value={usd(M.buybacks)} sub={`${pct(M.buybacks / M.sales)} of sales`} tone="out" />
              <Fig label={`Kept by the machine, ${winShort}`} value={usd(M.net)} sub="before the cost of the cards" />
              <Fig label="CARDS burned" value={`${compact(L.burnedBySupply, 1)}`} sub={`${pct(L.burnedBySupply / L.maxSupply, 2)} of the 2B supply`} />
            </div>
          </div>
          <Slab year="2026" title="Collector Crypt" line2={`Gacha pack sales, ${win}`} grade={usd(M.sales)} gradeSub={`${pct(M.buybacks / M.sales, 0)} bought back`}
            cert="GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3" certHref={sol("GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3")}>
            <div className="mb-2 flex items-center justify-between text-[12px] text-mute">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-in" />Pack sales</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-out" />Buybacks</span>
              <span>daily</span>
            </div>
            <SlabSpark rows={inCov.slice(-90).map((d) => ({ d: d.d, sales: d.solana, buybacks: d.buybacks }))} />
          </Slab>
        </section>

        <div className="mb-10 rounded-[6px] border border-line bg-panel px-4 py-3 text-[14px] leading-relaxed text-mute">
          Every Solana figure below is rebuilt from {n0(T.packs)} pack payments and their buybacks between {dayLabel(cov.from ?? "")} and {dayLabel(cov.to ?? "")} ({cov.days} days).
          The pull runs newest-first and keeps extending back toward the machine&apos;s first sale in 2024; each daily refresh adds history until it&apos;s complete.
        </div>

        <Exhibit id="flow" n={1}
          title={`Of every $100 put into packs, $${(T.buybacks / T.sales * 100).toFixed(0)} comes straight back out as buybacks`}
          note={<>A pack sale is USDC into the gacha wallet from any non-team wallet. A buyback is USDC out of it to a non-team wallet. Money moving between Collector Crypt&apos;s own wallets is neither. What&apos;s kept still has to pay for the physical cards in the machine.</>}
          source={<>Every stablecoin transfer in and out of the gacha wallet&apos;s USDC, USDT, JupUSD and CASH accounts, read from Solana transactions.</>}>
          <div className="mb-2 flex justify-between text-[13px] text-mute"><span>{usd(T.sales)} of pack sales</span><span>100%</span></div>
          <div className="flex h-10 w-full overflow-hidden rounded-[4px]" role="img" aria-label={`Pack sales split: ${pct(T.buybacks / T.sales)} paid back as buybacks, ${pct(kept / T.sales)} kept`}>
            <div className="flex items-center bg-out/80 px-3 text-[13.5px] font-medium text-ink" style={{ width: pct(T.buybacks / T.sales, 3) }}>Paid back to players, {pct(T.buybacks / T.sales)}</div>
            <div className="bg-paper" style={{ width: pct(kept / T.sales, 3) }} />
          </div>
          <div className="mt-2 flex justify-end text-[13px] text-mute"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-paper" />Kept {pct(kept / T.sales)}</span></div>
          <p className="mt-8 mb-1 text-[14px] text-mute">Following the {usd(kept)} kept:</p>
          <div className="-mx-4 overflow-x-auto px-4">
            <Sankey cols={3} height={280} labelW={250} ariaLabel="Sankey of the money the gacha machine keeps: part funds the CARDS buyback, part moves to Collector Crypt wallets, and the rest stays in the float"
              nodes={[
                { id: "kept", col: 0, label: "Kept by the machine", sub: usd(kept), color: "#f2f0ea" },
                { id: "team", col: 1, label: "Moved to Collector Crypt wallets", sub: usd(Math.max(T.teamOut - T.teamIn, 0)), color: "#8d93a0", order: 0 },
                { id: "bb", col: 1, label: "Sent to the CARDS buyback", sub: usd(T.toCardsBuyback), color: "#d9b45b", order: 1 },
                { id: "float", col: 1, label: "Left in the gacha float", sub: usd(otherKept), color: "#4f8dff", order: 2 },
              ]}
              links={[
                { from: "kept", to: "team", value: Math.max(T.teamOut - T.teamIn, 0), color: "#8d93a0" },
                { from: "kept", to: "bb", value: T.toCardsBuyback, color: "#d9b45b" },
                { from: "kept", to: "float", value: otherKept, color: "#4f8dff" },
              ]} />
          </div>
        </Exhibit>

        <Exhibit id="sales" n={2}
          title={`Pack sales and buybacks move together; the machine kept ${pct(M.net / M.sales)} of sales in the last ${win}`}
          note={<>Blue bars: pack sales per {per}. Orange bars: buybacks paid to players. The line is what was kept. Below, the share of sales paid straight back. Sales here include card-payment purchases{evmSales ? " and the Base and Robinhood Chain machines" : ""}.</>}
          source={<>Gacha wallet stablecoin transfers, card-payment wallet inflows{evmSales ? ", EVM Paid and SoldBack events" : ""}.</>}>
          <SalesVsBuybacks rows={weeks.map((w) => ({ w: w.w, sales: w.sales, buybacksNeg: -w.buybacks, net: w.net }))} />
          <div className="mt-6"><PayoutRatio rows={weeks.filter((w) => w.sales > 0).map((w) => ({ w: w.w, ratio: w.buybacks / w.sales }))} /></div>
        </Exhibit>

        <Exhibit id="stores" n={3}
          title={`${storeName(data.stores[0].store)}'s own site sells ${pct(data.stores[0].sales / T.solanaSales, 0)} of packs; partner storefronts sell the rest`}
          note={<>Every pack payment carries a memo naming the storefront that sold it, like <span className="text-paper">jupiter-&lt;id&gt;:open</span>. Partners run the same machine through Collector Crypt&apos;s API. Names not on a public list are shown as their memo prefix.</>}
          source={<>SPL Memo on each pack-purchase transaction.</>}>
          <StoreStack rows={storeRows} stores={[...topStores, "other"]} labels={{ ...Object.fromEntries(topStores.map((s) => [s, storeName(s)])), other: "Other" }} />
          <div className="mt-6 max-w-[620px]">
            {data.stores.slice(0, 8).map((s) => (
              <HBar key={s.store} label={storeName(s.store)} value={s.sales} max={data.stores[0].sales} right={usd(s.sales)} />
            ))}
          </div>
        </Exhibit>

        <Exhibit id="packs" n={4}
          title="$50 packs sell the most; the $5,000 packs bring in the most money"
          note={<>Each bar is total pack sales at one price point, with the pack count beside it. &ldquo;Other&rdquo; covers promotional and odd-priced machines.</>}
          source={<>Amount of each pack-purchase transfer.</>}>
          <div className="max-w-[680px]">
            {data.tiers.map((t) => (
              <div key={t.tier} className="grid grid-cols-[70px_1fr_150px] items-center gap-3 py-1.5 text-[14px]">
                <span className="cond text-[17px] text-paper">{t.tier === "other" ? "Other" : `$${n0(Number(t.tier))}`}</span>
                <span className="h-3.5 rounded-[2px] bg-raise"><span className="block h-3.5 rounded-[2px] bg-in" style={{ width: `${(t.sales / maxTier) * 100}%` }} /></span>
                <span className="text-right text-mute"><span className="cond text-[16px] text-paper">{usd(t.sales)}</span> · {compact(t.packs, 1)} packs</span>
              </div>
            ))}
          </div>
        </Exhibit>

        <Exhibit id="whales" n={5}
          title={`${n0(Q.whales)} wallets spent $100K or more; together they put in ${pct(Q.whaleShare, 0)} of the money`}
          note={<>{n0(Q.buyers)} wallets bought at least one pack in the covered period. Each bar is the share of all pack spending that came from the top wallets.</>}
          source={<>Pack-purchase transfers grouped by paying wallet.</>}>
          <div className="max-w-[680px]">
            <HBar label="Top wallet" value={Q.lorenz[0].share} max={1} right={pct(Q.lorenz[0].share)} />
            <HBar label="Top 10" value={Q.top10} max={1} right={pct(Q.top10)} />
            <HBar label="Top 100" value={Q.top100} max={1} right={pct(Q.top100)} />
            <HBar label="Top 1%" value={Q.top1pct} max={1} right={pct(Q.top1pct)} />
            <HBar label="$100K+ wallets" value={Q.whaleShare} max={1} right={pct(Q.whaleShare)} color="var(--gold)" />
          </div>
        </Exhibit>

        <Exhibit id="token" n={6}
          title={`${compact(L.burnedBySupply, 1)} CARDS burned so far, ${pct(L.burnedBySupply / L.maxSupply, 2)} of the fixed supply`}
          note={<>Since April 2026 a bot takes USDC from the gacha wallet and buys CARDS on the Raydium pool, in thousands of small swaps. The CARDS go to a burn wallet that destroys them in batches. Gold bars: USDC spent per week. Line: CARDS burned to date. Last buyback price ${L.cardsPrice?.toFixed(4)}.</>}
          source={<>Buyback bot and burn wallet transfers and burns; supply read from the CARDS mint ({n0(L.supply)} left of 2,000,000,000).</>}>
          <TokenChart rows={tokenRows} />
          <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
            <Fig label="Spent buying CARDS" value={usd(T.cardsBoughtUsd)} sub={`${compact(T.cardsBought, 1)} CARDS bought`} />
            <Fig label="Burned (traced)" value={compact(T.cardsBurned, 1)} sub={`${pct(T.cardsBurned / L.burnedBySupply, 1)} of the supply drop`} />
            <Fig label="Gacha float" value={usd(L.gachaFloat)} sub="USDC on hand for buybacks" />
          </div>
        </Exhibit>

        <Exhibit id="contracts" n={7}
          title="One wallet takes every payment and pays every buyback"
          note={<>Click any box or address to open it on an explorer. Blue arrows carry money in, orange money out, gold the CARDS buyback.</>}
          source={<>Addresses from docs.collectorcrypt.com (CARDS, gacha API, cc-buyback and VRF pages), plus wallets found onchain or in DefiLlama&apos;s open-source adapter, each checked against live transactions.</>}>
          <div className="-mx-4 overflow-x-auto px-4"><ContractDiagram /></div>
          <div className="mt-8"><ContractTable /></div>
        </Exhibit>

        <Exhibit id="method" n={8}
          title="How the numbers are built"
          note={<>Pipeline code is public and refreshes daily on GitHub Actions.</>}
          source={<>Helius and Alchemy Solana RPC (getTransactionsForAddress), Alchemy for Base, the public Robinhood Chain RPC. No Dune, no third-party dashboards.</>}>
          <div className="grid gap-8 text-[15px] leading-relaxed text-paper/85 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-paper">Rules</h3>
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>Stablecoins count at $1 (USDC, USDT, JupUSD, CASH, USDG).</li>
                <li>Transfers between Collector Crypt&apos;s own wallets are internal: never a sale, never a buyback.</li>
                <li>Pack sale: stablecoin into a gacha wallet from anyone else. Buyback: stablecoin out to anyone else.</li>
                <li>Storefront comes from the transaction&apos;s memo. Price tier is the payment amount.</li>
                <li>Card-payment sales are counted where they land, in the card-payment wallet, not again when forwarded.</li>
              </ol>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-paper">Checks</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>CARDS burns traced to the burn wallet ({compact(T.cardsBurned, 2)}) match the drop in mint supply ({compact(L.burnedBySupply, 2)}) to {pct(T.cardsBurned / L.burnedBySupply, 1)}.</li>
              </ul>
              <h3 className="mt-5 mb-2 font-semibold text-paper">Known limits</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Coverage is {dayLabel(cov.from ?? "")} onward while the backfill runs.</li>
                <li>&ldquo;Kept&rdquo; is before the cost of the physical cards, so it isn&apos;t profit.</li>
                <li>Unlabelled team wallets would make internal moves look like sales or buybacks; the team list is published in the repo.</li>
              </ul>
            </div>
          </div>
        </Exhibit>
      </main>

      <footer className="mx-auto max-w-[1200px] border-t border-line px-4 py-8 text-[12.5px] leading-relaxed text-mute sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p>Independent research by <a href="https://paultimofeev.com" className="underline">Paul Timofeev</a>. Not affiliated with Collector Crypt. Not investment advice.</p>
          <p>Built {data.generatedAt.slice(0, 16).replace("T", " ")} UTC. <a href="https://github.com/paultimfv/collector-crypt-research" className="underline">Source code</a></p>
        </div>
      </footer>
    </>
  );
}
