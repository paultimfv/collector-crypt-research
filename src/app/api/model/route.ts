// GET /api/model: Collector Crypt's daily onchain series rolled up for a model sheet.
//   ?period=month (default) | quarter | year    ?from=2025-01-01    ?format=csv (default) | json
// Google Sheets: =IMPORTDATA("<this site>/api/model?period=month")
import { getData } from "@/lib/data";
import { respond, type Metric, type Row } from "@/lib/model-export";

export const revalidate = 300;

const METRICS: Metric[] = [
  { section: "GACHA", label: "Pack sales USD (all chains)", key: "sales", agg: "sum" },
  { section: "GACHA", label: "  Solana", key: "solana", agg: "sum" },
  { section: "GACHA", label: "  Base", key: "base", agg: "sum" },
  { section: "GACHA", label: "  Robinhood Chain", key: "robinhood", agg: "sum" },
  { section: "GACHA", label: "  Fiat", key: "fiat", agg: "sum" },
  { section: "GACHA", label: "Packs opened", key: "packs", agg: "sum" },
  { section: "GACHA", label: "Avg pack price USD", key: "avgPack", agg: "ratio", num: "sales", den: "packs" },
  { section: "GACHA", label: "Card buybacks paid to users USD", key: "buybacks", agg: "sum" },
  { section: "GACHA", label: "Buyback rate (buybacks / sales)", key: "bbRate", agg: "ratio", num: "buybacks", den: "sales" },
  { section: "REVENUE", label: "Gacha net USD (sales - buybacks)", key: "net", agg: "sum" },
  { section: "REVENUE", label: "Net margin (net / sales)", key: "margin", agg: "ratio", num: "net", den: "sales" },
  { section: "REVENUE", label: "Marketplace royalties USD", key: "royalties", agg: "sum" },
  { section: "REVENUE", label: "Total revenue USD (net + royalties)", key: "revenue", agg: "sum" },
  { section: "TOKEN", label: "CARDS bought back (tokens)", key: "cardsBought", agg: "sum" },
  { section: "TOKEN", label: "CARDS bought back USD", key: "cardsBoughtUsd", agg: "sum" },
  { section: "TOKEN", label: "CARDS buyback share of revenue", key: "bbShare", agg: "ratio", num: "cardsBoughtUsd", den: "revenue" },
  { section: "TOKEN", label: "CARDS burned (tokens)", key: "cardsBurned", agg: "sum" },
];

export async function GET(request: Request) {
  const data = await getData();
  const rows: Row[] = data.daily.map((r) => ({ ...r, revenue: (r.net ?? 0) + (r.royalties ?? 0) }));
  return respond(request, rows, METRICS, { source: "Collector Crypt onchain (Solana, Base, Robinhood Chain), refreshed hourly", coverage: data.coverage, generatedAt: data.generatedAt });
}
