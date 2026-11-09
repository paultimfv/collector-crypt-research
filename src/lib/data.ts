// Data lives in the GitHub repo (the hourly workflow commits it), so the site reads it straight from there and
// re-checks every 5 minutes: fresh data with no redeploy. The copy bundled at build time is the fallback.
import fallback from "@/data/cards.json";

export type CardsData = typeof fallback;
const RAW = "https://raw.githubusercontent.com/paultimfv/collector-crypt-research/main/src/data/cards.json";

export async function getData(): Promise<CardsData> {
  try {
    const r = await fetch(RAW, { next: { revalidate: 300 } });
    if (r.ok) {
      const d = (await r.json()) as CardsData;
      if (d?.totals && d?.weekly?.length) return d;
    }
  } catch {}
  return fallback;
}
