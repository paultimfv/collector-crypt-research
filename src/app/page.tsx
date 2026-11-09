import { getData } from "@/lib/data";
import { liveCards } from "@/lib/live";
import { TimeChart } from "@/components/charts";
import GradeLabel from "@/components/grade-label";
import ThemeToggle from "@/components/theme-toggle";
import { AddressTable, BarList, FlowMap, Kpi, Panel, Section } from "@/components/ui";
import { n0, pct, usd, compact, dayLabel } from "@/lib/fmt";

export const revalidate = 60; // live CARDS supply / price / gacha activity every minute; history from the hourly pipeline

const A = {
  gacha: "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3",
  usdc: "D9CEogjHA6CpS12F8St9zpSco7pQKJB5uR1RqDsuzQZk",
  oldGacha: "GachazZscHZ5bn3vnq1yEC4zpYdhAYJBzuKJwSJksc9z",
  mint: "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp",
  bot: "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq",
  burn: "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4",
  pool: "HnhpJPJgBG2KwniMTNW8cVBHvk1hFog3RC3kjnyc23tD",
  treasury: "3PnVBrb4wPLFLW38oaYR7dA6HSfKpawxHGESPj5kF1QB",
  fiat: "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s",
  vrf: "ccvrfu3fSpbnPLiUqdWAt85Zn9nq96ekwGTbHqGtdgQ",
  evm: "0x4d56B148624e17FD53c08D1C4998e8e3945bDE28",
};
const scan = (a: string) => `https://solscan.io/account/${a}`;
const baseScan = `https://basescan.org/address/${A.evm}`;
const SRC = {
  gacha: [{ label: "gacha wallet stablecoin transfers", href: scan(A.gacha) }],
  memo: [{ label: "payment memos to the gacha wallet", href: scan(A.gacha) }],
  evm: [{ label: "EVM gacha contract logs (Base, Robinhood Chain)", href: baseScan }],
  cards: [{ label: "buyback bot", href: scan(A.bot) }, { label: "burn wallet", href: scan(A.burn) }],
};

const STORE_LABELS: Record<string, string> = {};

const ADDRESSES = [
  { name: "Gacha wallet", addr: A.gacha, role: "Receives pack payments, pays card buybacks" },
  { name: "Gacha USDC account", addr: A.usdc, role: "Gacha wallet's USDC token account" },
  { name: "Old gacha wallet", addr: A.oldGacha, role: "Gacha wallet before Dec 7, 2025" },
  { name: "Card-payment wallet", addr: A.fiat, role: "Credit-card pack purchases" },
  { name: "CARDS mint", addr: A.mint, role: "CARDS token, 2B initial supply" },
  { name: "CARDS buyback bot", addr: A.bot, role: "Buys CARDS on Raydium with USDC from the gacha wallet" },
  { name: "Burn wallet", addr: A.burn, role: "Receives bought CARDS, burns them" },
  { name: "Raydium CARDS/USDC pool", addr: A.pool, role: "Pool used by the buyback bot" },
  { name: "Treasury", addr: A.treasury, role: "Collector Crypt multisig" },
  { name: "VRF program", addr: A.vrf, role: "Random draw for each pack" },
  { name: "EVM gacha (Base, Robinhood Chain)", addr: A.evm, role: "Gacha contract on EVM chains", href: baseScan },
];

export default async function Page() {
  const data = await getData();
  const T = data.totals;
  const L = await liveCards(data.live, data.generatedAt);
  const Q = data.concentration;
  const E = data.evm;
  const cov = data.coverage;
  const M = data.last30;

  const toTeam = Math.max(T.teamOut - T.teamIn, 0);
  const windowLabel = `${dayLabel(cov.from ?? "")} to ${dayLabel(cov.to ?? "")}`;
  type Row = Record<string, number | string>;
  const weekly = (data.weekly as unknown as Row[]).filter((w) => String(w.w) >= (cov.from ?? "")).slice(0, -1); // drop the partial current week
  const cardsWeekly = (data.weekly as unknown as Row[]).filter((w) => String(w.w) >= "2026-04-13").slice(0, -1);
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-10 pt-5 sm:px-6">
      <div className="flex justify-end"><ThemeToggle /></div>
      <header className="mt-2 grid items-end gap-x-12 gap-y-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h1 className="page-t">Collector Crypt</h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted">
            Gacha pack sales, card buybacks and the CARDS token, read straight from the chain. Pack data {windowLabel}.
            {" "}<a className="underline decoration-line underline-offset-2 hover:text-text" href="https://collectorcrypt.com" target="_blank" rel="noreferrer">collectorcrypt.com</a>
          </p>
        </div>
        <GradeLabel top="Collector Crypt" line2={`Pack sales, ${cov.days} days`} grade={usd(T.sales)} gradeSub={`${n0(T.packs)} packs`} cert={A.gacha} />
      </header>

      <Section title="Sales, buybacks and CARDS" sub={L.fresh
        ? `${windowLabel}, updated hourly. Live from Solana at ${L.at.slice(11, 16)} UTC: ${n0(L.txLastHour ?? 0)} gacha transactions in the last hour, ${usd(L.gachaFloat)} USDC in the machine.`
        : `${windowLabel}, updated hourly.`}>
        <div className="kpis grid grid-cols-2 md:grid-cols-4">
          <Kpi label="Pack sales" value={usd(T.sales)} note={`${n0(T.packs)} packs`} />
          <Kpi label="Card buybacks paid" value={usd(T.buybacks)} note={`${pct(T.buybacks / T.sales)} of sales`} />
          <Kpi label="Sales minus buybacks" value={usd(T.sales - T.buybacks)} note={`${pct(1 - T.buybacks / T.sales)} of sales`} />
          <Kpi label="Buyers" value={n0(Q.buyers)} note="Unique paying wallets" />
          <Kpi label="Pack sales, 30d" value={usd(M.sales)} note={`${n0(M.packs)} packs`} />
          <Kpi label="CARDS price" value={L.marketPrice ? `$${L.marketPrice.toFixed(4)}` : L.cardsPrice ? `$${L.cardsPrice.toFixed(4)}` : "n/a"}
            note={L.marketPrice ? `Live, Jupiter${L.cardsPrice ? ` · last buyback $${L.cardsPrice.toFixed(4)}` : ""}` : "Latest buyback"} />
          <Kpi label="CARDS burned" value={compact(L.burnedBySupply)} note={`${pct(L.burnedBySupply / L.maxSupply, 2)} of 2B supply`} />
          <Kpi label="CARDS buyback spent" value={usd(T.cardsBoughtUsd)} note={`${compact(T.cardsBought)} CARDS since Apr 2026`} />
        </div>
      </Section>

      <Section title="Flows" sub={`Solana pack totals for ${windowLabel}; CARDS totals since April 2026. Click a box to open it on Solscan.`}>
        <FlowMap cols={4} rows={3} ariaLabel="Collector Crypt flow: players pay the gacha wallet, which pays card buybacks, sends funds to Collector Crypt wallets, and funds the CARDS buyback and burn"
          nodes={[
            { id: "players", col: 0, row: 1, title: "Players", sub: "any storefront" },
            { id: "gacha", col: 1, row: 1, title: "Gacha wallet", sub: "pack payments", addr: A.gacha, kind: "contract" },
            { id: "back", col: 2, row: 0, title: "Card buybacks", sub: "paid to players", kind: "outcome" },
            { id: "team", col: 2, row: 1, title: "Collector Crypt wallets", sub: "net transfers", kind: "outcome" },
            { id: "bot", col: 2, row: 2, title: "CARDS buyback bot", sub: "buys on Raydium", addr: A.bot, kind: "wallet" },
            { id: "burnw", col: 3, row: 2, title: "Burn wallet", sub: "burns CARDS", addr: A.burn, kind: "wallet" },
            { id: "burned", col: 3, row: 1, title: "Burned", sub: "CARDS supply", kind: "outcome" },
          ]}
          edges={[
            { from: "players", to: "gacha", label: usd(T.solanaSales) },
            { from: "gacha", to: "back", label: usd(T.buybacks) },
            { from: "gacha", to: "team", label: usd(toTeam) },
            { from: "gacha", to: "bot", label: usd(T.toCardsBuyback) },
            { from: "bot", to: "burnw", label: `${compact(T.cardsBought)} CARDS` },
            { from: "burnw", to: "burned", label: `${compact(T.cardsBurned)} CARDS` },
          ]} />
      </Section>

      <Section title="Week by week">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
          <Panel title="Pack sales vs card buybacks per week" source={SRC.gacha}>
            <TimeChart rows={weekly.map((w) => ({ d: String(w.w), sales: Number(w.sales), buybacks: Number(w.buybacks) }))} prefix="$"
              series={[{ key: "sales", name: "Pack sales", color: "var(--accent)", type: "line" }, { key: "buybacks", name: "Card buybacks", color: "var(--accent2)", type: "line" }]} />
          </Panel>
          <Panel title="Sales minus buybacks per week" source={SRC.gacha}>
            <TimeChart rows={weekly.map((w) => ({ d: String(w.w), v: Number(w.net) }))} prefix="$"
              series={[{ key: "v", name: "Sales minus buybacks", color: "var(--accent)", type: "bar" }]} />
          </Panel>
          <Panel title="Packs opened per week" source={SRC.gacha}>
            <TimeChart rows={weekly.map((w) => ({ d: String(w.w), v: Number(w.packs) }))}
              series={[{ key: "v", name: "Packs", color: "var(--accent)", type: "bar" }]} />
          </Panel>
          <Panel title="Pack sales on EVM chains per week" sub={`Base ${usd(E.base.sales)}, Robinhood Chain ${usd(E.robinhood.sales)} in total. Not included in the Solana totals.`} source={SRC.evm}>
            <TimeChart rows={weekly.map((w) => ({ d: String(w.w), base: Number(w.base ?? 0), rh: Number(w.robinhood ?? 0) }))} prefix="$"
              series={[{ key: "base", name: "Base", color: "var(--accent)", type: "bar", stack: "s" }, { key: "rh", name: "Robinhood Chain", color: "var(--accent2)", type: "bar", stack: "s" }]} />
          </Panel>
          <Panel title="Pack sales by storefront" sub="Grouped by the memo prefix on each payment." source={SRC.memo}>
            <BarList rows={data.stores.slice(0, 8).map((s) => ({ label: STORE_LABELS[s.store] ?? s.store, value: s.sales }))} fmt={(v) => usd(v)} />
          </Panel>
          <Panel title="Pack sales by pack price" source={SRC.memo}>
            <BarList rows={data.tiers.map((t) => ({ label: t.tier === "other" ? "Other" : `$${n0(Number(t.tier))}`, value: t.sales }))} fmt={(v) => usd(v)} />
          </Panel>
          <Panel title="Share of pack sales by top buyers" sub={`${n0(Q.buyers)} buying wallets.`} source={SRC.gacha}>
            <BarList rows={Q.lorenz.filter((l) => l.top < Q.buyers).map((l) => ({ label: `Top ${n0(l.top)}`, value: l.share }))} fmt={(v) => pct(v, 1)} />
          </Panel>
          <Panel title="CARDS buyback per week, USDC spent" source={SRC.cards}>
            <TimeChart rows={cardsWeekly.map((w) => ({ d: String(w.w), v: Number(w.cardsBoughtUsd ?? 0) }))} prefix="$"
              series={[{ key: "v", name: "USDC spent", color: "var(--accent)", type: "bar" }]} />
          </Panel>
        </div>
      </Section>

      <Section title="Contracts and wallets">
        <AddressTable rows={ADDRESSES} />
      </Section>

      <Section title="Data">
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-muted">
          <li>Pack sales and card buybacks: every USDC, USDT, JupUSD and CASH transfer in and out of the <a className="underline" href={scan(A.gacha)} target="_blank" rel="noreferrer">gacha wallet</a>, {windowLabel}. Transfers in from non-Collector Crypt wallets are pack sales; transfers out to them are card buybacks. Transfers between Collector Crypt wallets are excluded.</li>
          <li>Storefront and pack price: the memo on each payment (format <span className="text-text">store-id:open</span>).</li>
          <li>CARDS: transfers of the <a className="underline" href={scan(A.bot)} target="_blank" rel="noreferrer">buyback bot</a> and <a className="underline" href={scan(A.burn)} target="_blank" rel="noreferrer">burn wallet</a>; burned total from the <a className="underline" href={scan(A.mint)} target="_blank" rel="noreferrer">mint</a> supply ({compact(T.cardsBurned, 2)} traced to the burn wallet).</li>
          <li>EVM: gacha contract logs on <a className="underline" href={baseScan} target="_blank" rel="noreferrer">Base</a> and Robinhood Chain.</li>
          <li>Solana data via Alchemy RPC. Updated hourly.</li>
        </ul>
      </Section>

      <footer className="mt-16 border-t-2 border-text pt-5 text-[13px] text-muted">
        By <a className="underline" href="https://paultimofeev.com">Paul Timofeev</a>. Not affiliated with Collector Crypt.
      </footer>
    </main>
  );
}
