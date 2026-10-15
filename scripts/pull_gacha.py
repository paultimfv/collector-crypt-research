"""Pull every stablecoin movement in and out of the Collector Crypt gacha wallet, one UTC day per file.

Source: Helius getTransactionsForAddress (full, jsonParsed) on each of the gacha wallet's stablecoin
token accounts. Each SPL transfer touching one of those accounts becomes a row. The memo on the same
transaction says what it was: `<storefront>-<uuid>:open` is a pack purchase, `...:buyback` is a card
sold back to the machine.

Writes data/raw/gacha/YYYY-MM-DD.csv (+ .done once the day is over).
Usage: python pull_gacha.py [since=YYYY-MM-DD|days_back] [workers] [--budget MINUTES]
"""
import sys, csv, json, time, datetime as dt, calendar
from concurrent.futures import ThreadPoolExecutor
from common import ROOT, rpc
from addresses import STABLES, TEAM

# stablecoin accounts of both gacha wallets: old sink USDC (2024-11 to 2025-12), then the current
# wallet's USDC, USDT, JupUSD and CASH (Token-2022) lanes
ACCOUNTS = ["7pySnvZVEauFhqfwWmDvt8G6yd5ShP4K1RM5vWNkDsx2", "D9CEogjHA6CpS12F8St9zpSco7pQKJB5uR1RqDsuzQZk", "6H3xDPbizdymF4XafHjpgCi1mwVJnoJ4WsFcmxfuXqeh",
            "Gc5CfioeaFLLfsaevfCBQzsMLGFztNBCGcVKpCLsBrFQ", "8HMCwKF1gBWQnfZx9BmFWZrq46cbdArLJF1aMk7urcij"]
OUT = ROOT / "data/raw/gacha"
COLS = ["ts", "dir", "amount", "token", "counterparty", "storefront", "action", "sig"]


def page(addr, a, b, token):
    opts = {"transactionDetails": "full", "limit": 100, "sortOrder": "asc", "encoding": "jsonParsed",
            "maxSupportedTransactionVersion": 1,
            "filters": {"blockTime": {"gte": a, "lt": b}, "status": "succeeded"}}
    if token:
        opts["paginationToken"] = token
    r = rpc("getTransactionsForAddress", [addr, opts])
    return r.get("data", []), r.get("paginationToken")


def rows_of(tx):
    m, meta = tx["transaction"]["message"], tx["meta"]
    keys = [k["pubkey"] if isinstance(k, dict) else k for k in m["accountKeys"]]
    owner = {}
    for b in (meta.get("preTokenBalances") or []) + (meta.get("postTokenBalances") or []):
        owner[keys[b["accountIndex"]]] = (b.get("owner"), b["mint"])
    ixs = list(m["instructions"]) + [i for g in (meta.get("innerInstructions") or []) for i in g["instructions"]]
    memo = next((ix["parsed"] for ix in ixs if ix.get("program") == "spl-memo" and isinstance(ix.get("parsed"), str)), "")
    store, action = "", ""
    if memo:
        head, _, action = memo.partition(":")
        store = head.rsplit("-", 5)[0] if head.count("-") >= 5 else head.split("-")[0]
        action = action.split(":")[0]
    out = []
    for ix in ixs:
        p = ix.get("parsed")
        if not isinstance(p, dict) or p.get("type") not in ("transfer", "transferChecked"):
            continue
        i = p["info"]
        src, dst = i.get("source"), i.get("destination")
        if src not in ACCOUNTS and dst not in ACCOUNTS:
            continue
        mint = i.get("mint") or owner.get(src, (None, None))[1] or owner.get(dst, (None, None))[1]
        if mint not in STABLES:
            continue
        amt = float(i["tokenAmount"]["uiAmountString"]) if "tokenAmount" in i else int(i["amount"]) / 1e6
        if dst in ACCOUNTS:
            d, cp = "in", i.get("authority") or i.get("multisigAuthority") or owner.get(src, ("", ""))[0]
        else:
            d, cp = "out", owner.get(dst, ("", ""))[0] or dst
        if src in ACCOUNTS and dst in ACCOUNTS:
            continue
        out.append([tx["blockTime"], d, round(amt, 6), STABLES[mint], cp, store, action,
                    tx["transaction"]["signatures"][0][:20]])
    return out


DEADLINE = float("inf")  # set by --budget; days not started by then are left for the next run


def pull_day(day):
    """Pull one UTC day. Rows are appended page by page to a .part file with a cursor, so a restart resumes."""
    path, done, part = OUT / f"{day}.csv", OUT / f"{day}.done", OUT / f"{day}.part"
    if done.exists():
        return day, "skip"
    if time.time() > DEADLINE:
        return day, "deferred"
    a = calendar.timegm(dt.date.fromisoformat(day).timetuple())
    b = min(a + 86400, int(time.time()))
    cur = OUT / f"{day}.cursor"
    state = json.loads(cur.read_text()) if cur.exists() and part.exists() else {"acct": 0, "token": None, "seen": []}
    if not part.exists():
        part.write_text("")
    calls = 0
    with open(part, "a", newline="") as f:
        w = csv.writer(f)
        for ai in range(state["acct"], len(ACCOUNTS)):
            token = state["token"] if ai == state["acct"] else None
            while True:
                txs, token = page(ACCOUNTS[ai], a, b, token)
                calls += 1
                for tx in txs:
                    w.writerows(rows_of(tx))
                f.flush()
                cur.write_text(json.dumps({"acct": ai, "token": token}))
                if calls % 50 == 0:
                    print(f"  {day} acct{ai} {calls} pages", flush=True)
                if not token or not txs:
                    break
            state["token"] = None
    # dedupe (a tx touching two of our accounts shows up twice) and sort
    rows = {tuple(r) for r in csv.reader(open(part))}
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(COLS)
        w.writerows(sorted(rows, key=lambda r: int(r[0])))
    part.unlink()
    cur.unlink(missing_ok=True)
    if a + 86400 <= time.time() - 600:
        done.touch()
    return day, len(rows)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    if "--budget" in sys.argv:
        i = sys.argv.index("--budget")
        DEADLINE = time.time() + float(sys.argv[i + 1]) * 60
        del sys.argv[i:i + 2]
    arg = sys.argv[1] if len(sys.argv) > 1 else "3"
    today = dt.datetime.now(dt.timezone.utc).date()
    back = (today - dt.date.fromisoformat(arg)).days if "-" in arg else int(arg)
    days = [(today - dt.timedelta(days=i)).isoformat() for i in range(back + 1)]
    with ThreadPoolExecutor(int(sys.argv[2]) if len(sys.argv) > 2 else 6) as ex:
        for day, n in ex.map(pull_day, days):
            if n not in ("skip", "deferred"):
                print(day, n, flush=True)
