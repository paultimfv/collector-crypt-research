"""Aggregate raw Collector Crypt flows into src/data/cards.json for the dashboard.

Rules (same spirit as Laso's deposit rules):
  1. Stablecoins count at $1.
  2. Money between Collector Crypt's own wallets (TEAM in addresses.py) is internal, never a sale or a payout.
  3. Pack sale = stablecoin into a gacha wallet from a non-team wallet.
     Buyback  = stablecoin out of a gacha wallet to a non-team wallet (a player selling a card back).
  4. Card-payment (fiat) sales arrive bundled into the fiat-rail wallet from the payment processor; counted there.
  5. EVM: Paid events are sales, SoldBack events are buybacks; team addresses excluded.
"""
import csv, glob, json, base64, struct, datetime as dt
from collections import defaultdict
from common import ROOT, rpc
from addresses import TEAM, EVM_TEAM, BUYBACK_BOT, CARDS, GACHA_USDC_ACCOUNT, TREASURY

TIERS = [25, 50, 100, 250, 500, 1000, 2500, 5000]


def day(ts):
    return dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).strftime("%Y-%m-%d")


def week(d):
    x = dt.date.fromisoformat(d)
    return (x - dt.timedelta(days=x.weekday())).isoformat()


def read(path):
    try:
        return list(csv.DictReader(open(path)))
    except FileNotFoundError:
        return []


def main():
    D = defaultdict(lambda: defaultdict(float))
    buyer_spend = defaultdict(float)
    buyer_first = {}
    store_sales = defaultdict(float)
    store_packs = defaultdict(int)
    tier_packs = defaultdict(int)
    tier_sales = defaultdict(float)
    internal_out = defaultdict(float)
    days_covered = []

    for f in sorted(glob.glob(str(ROOT / "data/raw/gacha/*.csv"))):
        d0 = f.rsplit("/", 1)[1][:10]
        days_covered.append(d0)
        for r in csv.DictReader(open(f)):
            amt, cp, d = float(r["amount"]), r["counterparty"], day(r["ts"])
            x = D[d]
            if r["dir"] == "in":
                if cp in TEAM:
                    x["team_in"] += amt
                    continue
                x["sales"] += amt
                x["packs"] += 1
                x["sales_sol"] += amt
                buyer_spend[cp] += amt
                buyer_first.setdefault(cp, d)
                s = r["storefront"] or "direct"
                store_sales[s] += amt
                store_packs[s] += 1
                x[f"store:{s}"] += amt
                t = amt if amt in TIERS else "other"
                tier_packs[t] += 1
                tier_sales[t] += amt
            else:
                if cp == BUYBACK_BOT:
                    x["to_cards_buyback"] += amt
                elif cp in TEAM:
                    internal_out[cp] += amt
                    x["team_out"] += amt
                else:
                    x["buybacks"] += amt
                    x["buyback_n"] += 1

    # fiat rail: bundled card-payment sales from outside the team
    for r in read(ROOT / "data/raw/wallets/fiat_rail.csv"):
        if r["kind"] == "transfer" and r["dir"] == "in" and r["counterparty"] not in TEAM and r["token"] != "CARDS":
            D[day(r["ts"])]["fiat_sales"] += float(r["amount"])

    # marketplace royalties
    for r in read(ROOT / "data/raw/wallets/royalty.csv"):
        if r["kind"] == "transfer" and r["dir"] == "in" and r["token"] not in ("CARDS", "wSOL"):
            D[day(r["ts"])]["royalties"] += float(r["amount"])

    # EVM gacha
    evm_tot = {}
    for chain in ("base", "robinhood"):
        s = b = n = 0
        for r in read(ROOT / f"data/raw/evm_{chain}.csv"):
            if r["who"].lower() in EVM_TEAM:
                continue
            a = float(r["amount"])
            if r["event"] == "paid":
                D[day(r["ts"])][f"evm_sales_{chain}"] += a
                s += a
                n += 1
            else:
                D[day(r["ts"])][f"evm_buybacks_{chain}"] += a
                b += a
        evm_tot[chain] = {"sales": round(s), "buybacks": round(b), "packs": n}

    # CARDS token: buyback bot purchases and burns, treasury LP fee claims and burns
    bot = read(ROOT / "data/raw/wallets/buyback_bot.csv")
    by_sig = defaultdict(list)
    for r in bot:
        by_sig[r["sig"]].append(r)
    for sig, rs in by_sig.items():
        d = day(rs[0]["ts"])
        usdc_out = sum(float(r["amount"]) for r in rs if r["kind"] == "transfer" and r["dir"] == "out" and r["token"] == "USDC")
        cards_in = sum(float(r["amount"]) for r in rs if r["kind"] == "transfer" and r["dir"] == "in" and r["token"] == "CARDS")
        burned = sum(float(r["amount"]) for r in rs if r["kind"] == "burn")
        if cards_in and usdc_out:
            D[d]["cards_bought"] += cards_in
            D[d]["cards_bought_usd"] += usdc_out
        D[d]["cards_burned"] += burned
    for r in read(ROOT / "data/raw/wallets/burn_wallet.csv"):
        if r["kind"] == "burn":
            D[day(r["ts"])]["cards_burned"] += float(r["amount"])
    for r in read(ROOT / "data/raw/wallets/treasury.csv"):
        if r["kind"] == "burn":
            D[day(r["ts"])]["cards_burned"] += float(r["amount"])

    # daily series
    days = sorted(D)
    series = []
    for k in days:
        x = D[k]
        sales = x["sales"] + x["fiat_sales"] + x["evm_sales_base"] + x["evm_sales_robinhood"]
        bb = x["buybacks"] + x["evm_buybacks_base"] + x["evm_buybacks_robinhood"]
        series.append({
            "d": k,
            "sales": round(sales),
            "solana": round(x["sales"]),
            "fiat": round(x["fiat_sales"]),
            "base": round(x["evm_sales_base"]),
            "robinhood": round(x["evm_sales_robinhood"]),
            "packs": int(x["packs"]),
            "buybacks": round(bb),
            "net": round(sales - bb),
            "royalties": round(x["royalties"]),
            "cardsBought": round(x["cards_bought"]),
            "cardsBoughtUsd": round(x["cards_bought_usd"]),
            "cardsBurned": round(x["cards_burned"]),
            "stores": {s.split(":", 1)[1]: round(v) for s, v in x.items() if s.startswith("store:")},
        })

    # buyer concentration over the covered period
    spends = sorted(buyer_spend.values(), reverse=True)
    total_spend = sum(spends) or 1
    def share_top(n):
        return sum(spends[:n]) / total_spend
    whales = [s for s in spends if s >= 100_000]
    lorenz = []
    acc = 0
    for i, s in enumerate(spends):
        acc += s
        if i in (0, 9, 99, 999, 9999) or i == len(spends) - 1:
            lorenz.append({"top": i + 1, "share": round(acc / total_spend, 4)})

    # live snapshot
    supply = int(rpc("getAccountInfo", [CARDS, {"encoding": "jsonParsed"}])["value"]["data"]["parsed"]["info"]["supply"]) / 1e6
    float_usdc = float(rpc("getTokenAccountBalance", [GACHA_USDC_ACCOUNT])["value"]["uiAmountString"])

    # trailing window = last 30 complete days that the gacha pull covers (today is partial)
    cov_days = [d for d in days_covered if (ROOT / f"data/raw/gacha/{d}.done").exists()]
    l30 = [s for s in series if s["d"] in set(cov_days[-30:])]
    s30 = lambda f: sum(s[f] for s in l30)
    burned_total = sum(s["cardsBurned"] for s in series)
    price_rows = [s for s in series if s["cardsBought"]]
    last_px = price_rows[-1]["cardsBoughtUsd"] / price_rows[-1]["cardsBought"] if price_rows else None

    weekly = defaultdict(lambda: defaultdict(float))
    for s in series:
        w = week(s["d"])
        for f in ("sales", "buybacks", "net", "solana", "fiat", "base", "robinhood", "packs", "cardsBoughtUsd", "cardsBurned", "royalties"):
            weekly[w][f] += s[f]
        for st, v in s["stores"].items():
            weekly[w]["st_" + st] += v

    # headline totals only over the window the gacha pull fully covers
    lo, hi = (days_covered[0], days_covered[-1]) if days_covered else ("", "")
    cov_series = [s for s in series if lo <= s["d"] <= hi]

    out = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "coverage": {"from": days_covered[0] if days_covered else None, "to": days_covered[-1] if days_covered else None,
                     "days": len(days_covered)},
        "totals": {
            "sales": round(sum(s["sales"] for s in cov_series)),
            "solanaSales": round(sum(s["solana"] for s in cov_series)),
            "fiatSales": round(sum(s["fiat"] for s in cov_series)),
            "packs": sum(s["packs"] for s in cov_series),
            "buybacks": round(sum(s["buybacks"] for s in cov_series)),
            "net": round(sum(s["net"] for s in cov_series)),
            "royalties": round(sum(s["royalties"] for s in cov_series)),
            "buyers": len(buyer_spend),
            "cardsBought": round(sum(s["cardsBought"] for s in series)),  # all-time: the bot history is complete
            "cardsBoughtUsd": round(sum(s["cardsBoughtUsd"] for s in series)),
            "cardsBurned": round(burned_total),
            "toCardsBuyback": round(sum(D[k]["to_cards_buyback"] for k in days if lo <= k <= hi)),
            "teamOut": round(sum(D[k]["team_out"] for k in days if lo <= k <= hi)),
            "teamIn": round(sum(D[k]["team_in"] for k in days if lo <= k <= hi)),
        },
        "last30": {"days": len(l30), "sales": s30("sales"), "buybacks": s30("buybacks"), "net": s30("net"), "packs": s30("packs"),
                   "cardsBoughtUsd": s30("cardsBoughtUsd")},
        "evm": evm_tot,
        "stores": sorted([{"store": s, "sales": round(v), "packs": store_packs[s]} for s, v in store_sales.items()], key=lambda x: -x["sales"]),
        "tiers": [{"tier": str(t), "packs": tier_packs[t], "sales": round(tier_sales[t])} for t in TIERS + ["other"] if tier_packs.get(t)],
        "concentration": {"buyers": len(spends), "top10": round(share_top(10), 4), "top100": round(share_top(100), 4),
                          "top1pct": round(share_top(max(len(spends) // 100, 1)), 4),
                          "whales": len(whales), "whaleShare": round(sum(whales) / total_spend, 4), "lorenz": lorenz},
        "live": {"supply": round(supply), "maxSupply": 2_000_000_000, "burnedBySupply": round(2_000_000_000 - supply), "gachaFloat": round(float_usdc),
                 "cardsPrice": round(last_px, 5) if last_px else None},
        "daily": series,
        "weekly": [{"w": w, **{f: round(v) for f, v in weekly[w].items()}} for w in sorted(weekly)],
    }
    (ROOT / "src/data").mkdir(parents=True, exist_ok=True)
    json.dump(out, open(ROOT / "src/data/cards.json", "w"), separators=(",", ":"))
    print(json.dumps({k: out[k] for k in ["coverage", "totals", "last30", "evm", "concentration", "live"]}, indent=1)[:3000])
    print("stores", out["stores"][:8])
    print("tiers", out["tiers"])


if __name__ == "__main__":
    main()
