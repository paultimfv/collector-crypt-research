import data from "@/data/cards.json";
import { TimeChart } from "@/components/charts";
import { AddressTable, BarList, FlowMap, Kpi, Panel, Section, Steps } from "@/components/ui";
import { n0, pct, usd, compact, dayLabel } from "@/lib/fmt";

const T = data.totals;
const L = data.live;
const Q = data.concentration;
const cov = data.coverage;

const STORE_LABELS: Record<string, string> = { cc: "Collector Crypt", jupiter: "Jupiter", slabz: "Slabz", arena: "Arena", comic: "Comic", direct: "No memo" };
const kept = T.sales - T.buybacks;
const toTeam = Math.max(T.teamOut - T.teamIn, 0);
const days = data.daily.filter((d) => cov.from && d.d >= cov.from && d.d < (cov.to ?? ""));
const windowLabel = `${dayLabel(cov.from ?? "")} to ${dayLabel(cov.to ?? "")}`;

const ADDRESSES = [
  { name: "Gacha wallet", addr: "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3", role: "Receives every pack payment and pays every buyback" },
  { name: "Gacha USDC account", addr: "D9CEogjHA6CpS12F8St9zpSco7pQKJB5uR1RqDsuzQZk", role: "The gacha wallet's USDC balance" },
  { name: "Old gacha wallet", addr: "GachazZscHZ5bn3vnq1yEC4zpYdhAYJBzuKJwSJksc9z", role: "Did the same job until December 2025" },
  { name: "Card-payment wallet", addr: "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s", role: "Packs bought by credit card land here, then move to the gacha wallet" },
  { name: "CARDS token (mint)", addr: "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp", role: "2B fixed supply; only goes down, through burns" },
  { name: "CARDS buyback bot", addr: "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq", role: "Gets USDC from the gacha wallet and buys CARDS on Raydium" },
  { name: "Burn wallet", addr: "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4", role: "Receives the bought CARDS and burns them in batches" },
  { name: "Raydium CARDS/USDC pool", addr: "HnhpJPJgBG2KwniMTNW8cVBHvk1hFog3RC3kjnyc23tD", role: "Where the buyback bot buys CARDS" },
  { name: "Treasury", addr: "3PnVBrb4wPLFLW38oaYR7dA6HSfKpawxHGESPj5kF1QB", role: "Collector Crypt's multisig" },
  { name: "VRF program", addr: "ccvrfu3fSpbnPLiUqdWAt85Zn9nq96ekwGTbHqGtdgQ", role: "Records the random draw for each pack" },
  { name: "EVM gacha (Base, Robinhood)", addr: "0x4d56B148624e17FD53c08D1C4998e8e3945bDE28", role: "The same machine on Base and Robinhood Chain", href: "https://basescan.org/address/0x4d56B148624e17FD53c08D1C4998e8e3945bDE28" },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-5">
        <div>
          <h1 className="text-[26px] font-semibold text-text">Collector Crypt dashboard</h1>
          <p className="mt-1 text-[14.5px] text-muted">Gacha machines for graded trading cards: players buy packs in USDC, get a real card as an NFT, and can sell it straight back.</p>
        </div>
        <p className="text-[13px] text-muted">Data through {dayLabel(cov.to ?? "")}</p>
      </header>

      <Section title="Key numbers" sub={`Pack figures cover ${windowLabel} (${cov.days} days). Older history is still loading and gets added daily.`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi label="Pack sales" value={usd(T.sales)} note={`${n0(T.packs)} packs opened`} />
          <Kpi label="Paid back to players" value={usd(T.buybacks)} note={`${pct(T.buybacks / T.sales)} of sales: players selling cards back`} />
          <Kpi label="Kept by Collector Crypt" value={usd(kept)} note={`${pct(kept / T.sales)} of sales, before paying for the cards`} />
          <Kpi label="Buyers" value={n0(Q.buyers)} note={`Top 100 wallets spent ${pct(Q.top100, 0)} of the money`} />
          <Kpi label="CARDS price" value={L.cardsPrice ? `$${L.cardsPrice.toFixed(4)}` : "n/a"} note="Price paid by the latest CARDS buyback" />
          <Kpi label="CARDS burned" value={compact(L.burnedBySupply)} note={`${pct(L.burnedBySupply / L.maxSupply, 2)} of the 2B supply`} />
        </div>
      </Section>

      <Section title="How the money flows" sub={`Pack totals for ${windowLabel}; CARDS totals since the buyback started in April 2026. Solid boxes are wallets and contracts (click to open on Solscan); dashed boxes are where the money ends up.`}>
        <FlowMap cols={4} rows={3} ariaLabel="Collector Crypt money flow: players pay the gacha wallet, which pays buybacks back to players, moves money to team wallets, and funds the CARDS buyback that burns CARDS"
          nodes={[
            { id: "players", col: 0, row: 0, title: "Players", sub: "any storefront" },
            { id: "fiat", col: 0, row: 2, title: "Card-payment wallet", sub: "credit card buys", addr: "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s", kind: "wallet" },
            { id: "gacha", col: 1, row: 1, title: "Gacha wallet", sub: "takes payments, pays buybacks", addr: "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3", kind: "contract" },
            { id: "back", col: 2, row: 0, title: "Back to players", sub: "cards sold back", kind: "outcome" },
            { id: "team", col: 2, row: 1, title: "Collector Crypt wallets", sub: "the business", kind: "outcome" },
            { id: "bot", col: 2, row: 2, title: "CARDS buyback bot", sub: "buys CARDS on Raydium", addr: "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq", kind: "wallet" },
            { id: "burnw", col: 3, row: 2, title: "Burn wallet", sub: "burns in batches", addr: "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4", kind: "wallet" },
            { id: "burned", col: 3, row: 0, title: "Burned", sub: "gone for good", kind: "outcome" },
          ]}
          edges={[
            { from: "players", to: "gacha", label: `${usd(T.solanaSales)} USDC` },
            { from: "fiat", to: "gacha", label: T.fiatSales ? usd(T.fiatSales) : "card sales" },
            { from: "gacha", to: "back", label: usd(T.buybacks) },
            { from: "gacha", to: "team", label: usd(toTeam) },
            { from: "gacha", to: "bot", label: usd(T.toCardsBuyback) },
            { from: "bot", to: "burnw", label: `${compact(T.cardsBought)} CARDS` },
            { from: "burnw", to: "burned", label: `${compact(T.cardsBurned)} CARDS` },
          ]} />
        <Steps items={[
          <>A player buys a pack ($25 to $5,000) on Collector Crypt or a partner site like Jupiter, and pays USDC to the gacha wallet: {usd(T.sales)} across {n0(T.packs)} packs in this period.</>,
          <>A random draw (recorded onchain by the VRF program) picks a real graded card from the vault, and the player receives it as an NFT.</>,
          <>Most players sell the card straight back for USDC. The gacha wallet paid {usd(T.buybacks)} back, {pct(T.buybacks / T.sales)} of what came in.</>,
          <>Collector Crypt keeps the rest, {usd(kept)}, before paying for the physical cards. Most of it moves on to Collector Crypt&apos;s other wallets.</>,
          <>A slice funds the CARDS buyback: a bot buys CARDS on Raydium ({usd(T.cardsBoughtUsd)} spent since April 2026) and sends it to a burn wallet, which has burned {compact(T.cardsBurned)} CARDS.</>,
        ]} />
      </Section>

      <Section title="Charts">
        <div className="grid gap-4">
          <Panel title="Pack sales vs buybacks, per day" sub="Blue: money players paid for packs. Orange: money paid back to players for cards they sold back. The gap is what Collector Crypt keeps.">
            <TimeChart rows={days.map((d) => ({ d: d.d, sales: d.sales, buybacks: d.buybacks }))} prefix="$"
              series={[{ key: "sales", name: "Pack sales", color: "var(--accent)", type: "line" }, { key: "buybacks", name: "Buybacks paid", color: "var(--accent2)", type: "line" }]} />
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Pack sales by storefront" sub="Which site sold the pack, from the note attached to each payment.">
              <BarList rows={data.stores.slice(0, 7).map((s) => ({ label: STORE_LABELS[s.store] ?? s.store, value: s.sales }))} fmt={(v) => usd(v)} />
            </Panel>
            <Panel title="Pack sales by pack price" sub="Total spent on each pack price.">
              <BarList rows={data.tiers.map((t) => ({ label: t.tier === "other" ? "Other" : `$${n0(Number(t.tier))} packs`, value: t.sales }))} fmt={(v) => usd(v)} />
            </Panel>
          </div>
          <Panel title="CARDS buyback, USDC spent per week" sub="How much USDC the buyback bot spent buying CARDS each week since it started in April 2026.">
            <TimeChart rows={(data.weekly as unknown as Record<string, number | string>[]).filter((w) => String(w.w) >= "2026-04-13").slice(0, -1).map((w) => ({ d: String(w.w), usdc: Number(w.cardsBoughtUsd ?? 0) }))} prefix="$"
              series={[{ key: "usdc", name: "USDC spent on CARDS", color: "var(--accent)", type: "bar" }]} />
          </Panel>
        </div>
      </Section>

      <Section title="Contracts and wallets" sub="Every address the numbers above are read from.">
        <AddressTable rows={ADDRESSES} />
      </Section>

      <Section title="How this is measured">
        <details className="rounded-lg border border-line bg-panel p-4 text-[14px] leading-relaxed text-muted">
          <summary className="text-text">Sources, rules and limits</summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Every stablecoin transfer in and out of the gacha wallet is read from Solana. Money in from anyone outside Collector Crypt is a pack sale; money out to anyone outside is a buyback. Moves between Collector Crypt&apos;s own wallets count as neither.</li>
            <li>The storefront comes from the note (memo) on each payment, for example <span className="text-text">jupiter-…:open</span>.</li>
            <li>CARDS figures come from the buyback bot and burn wallet. Burns traced: {compact(T.cardsBurned, 2)}; drop in total supply: {compact(L.burnedBySupply, 2)} ({pct(T.cardsBurned / L.burnedBySupply, 1)} matched).</li>
            <li>Pack figures cover {windowLabel}. The history goes back to November 2024 and is being added newest-first.</li>
            <li>&ldquo;Kept&rdquo; is before the cost of the physical cards, so it isn&apos;t profit.</li>
            <li>Data from Helius and Alchemy RPC. No Dune. Refreshed daily.</li>
          </ul>
        </details>
      </Section>

      <footer className="mt-12 border-t border-line pt-5 text-[13px] text-muted">
        By <a className="underline" href="https://paultimofeev.com">Paul Timofeev</a>. Independent, not affiliated with Collector Crypt. Not investment advice.
      </footer>
    </main>
  );
}
