"""Pull full history for the low-traffic Collector Crypt wallets: every token transfer and burn they're part of.

Wallets: CARDS buyback bot, treasury (Squads multisig), fiat/card rail, royalty collector.
Each row is one transfer or burn where the wallet owns the source, the destination or the burned account.
Writes data/raw/wallets/<name>.csv, appending txs newer than the last saved one.
"""
import csv, time
from common import ROOT, rpc
from addresses import BUYBACK_BOT, BURN_WALLET, TREASURY, FIAT_RAIL, ROYALTY, STABLES, CARDS, RAYDIUM_CLMM

WALLETS = {"buyback_bot": BUYBACK_BOT, "burn_wallet": BURN_WALLET, "treasury": TREASURY, "fiat_rail": FIAT_RAIL, "royalty": ROYALTY}
OUT = ROOT / "data/raw/wallets"
COLS = ["ts", "kind", "dir", "amount", "token", "counterparty", "clmm", "sig"]
TOKENS = {**STABLES, CARDS: "CARDS", "So11111111111111111111111111111111111111112": "wSOL"}


def rows_of(tx, wallet):
    m, meta = tx["transaction"]["message"], tx["meta"]
    keys = [k["pubkey"] if isinstance(k, dict) else k for k in m["accountKeys"]]
    owner = {}
    for b in (meta.get("preTokenBalances") or []) + (meta.get("postTokenBalances") or []):
        owner[keys[b["accountIndex"]]] = (b.get("owner"), b["mint"])
    ixs = list(m["instructions"]) + [i for g in (meta.get("innerInstructions") or []) for i in g["instructions"]]
    clmm = int(any(ix.get("programId") == RAYDIUM_CLMM for ix in ixs))
    sig = tx["transaction"]["signatures"][0][:20]
    out = []
    for ix in ixs:
        p = ix.get("parsed")
        if not isinstance(p, dict):
            continue
        t, i = p.get("type"), p.get("info", {})
        if t in ("transfer", "transferChecked") and "source" in i and "lamports" not in i:
            src_o, dst_o = owner.get(i["source"], (None, None)), owner.get(i["destination"], (None, None))
            mint = i.get("mint") or src_o[1] or dst_o[1]
            if mint not in TOKENS:
                continue
            amt = float(i["tokenAmount"]["uiAmountString"]) if "tokenAmount" in i else None
            if amt is None:
                dec = next((b["uiTokenAmount"]["decimals"] for b in (meta.get("postTokenBalances") or []) if b["mint"] == mint), 6)
                amt = int(i["amount"]) / 10 ** dec
            src_owner = i.get("authority") or src_o[0]
            if src_owner == wallet or src_o[0] == wallet:
                out.append([tx["blockTime"], "transfer", "out", amt, TOKENS[mint], dst_o[0] or i["destination"], clmm, sig])
            elif dst_o[0] == wallet:
                out.append([tx["blockTime"], "transfer", "in", amt, TOKENS[mint], src_owner or i["source"], clmm, sig])
        elif t in ("burn", "burnChecked") and i.get("mint") == CARDS:
            if i.get("authority") == wallet or owner.get(i.get("account"), (None,))[0] == wallet:
                amt = float(i["tokenAmount"]["uiAmountString"]) if "tokenAmount" in i else int(i["amount"]) / 1e6
                out.append([tx["blockTime"], "burn", "out", amt, "CARDS", "", clmm, sig])
    return out


def pull(name, addr):
    path = OUT / f"{name}.csv"
    start = 0
    if path.exists():
        rows = list(csv.reader(open(path)))[1:]
        start = int(rows[-1][0]) + 1 if rows else 0
    else:
        with open(path, "w", newline="") as f:
            csv.writer(f).writerow(COLS)
    token, n = None, 0
    with open(path, "a", newline="") as f:
        w = csv.writer(f)
        while True:
            opts = {"transactionDetails": "full", "limit": 100, "sortOrder": "asc", "encoding": "jsonParsed",
                    "maxSupportedTransactionVersion": 1,
                    "filters": {"blockTime": {"gte": start, "lt": int(time.time())}, "status": "succeeded"}}
            if token:
                opts["paginationToken"] = token
            r = rpc("getTransactionsForAddress", [addr, opts])
            for tx in r.get("data", []):
                for row in rows_of(tx, addr):
                    w.writerow(row)
                    n += 1
            token = r.get("paginationToken")
            if not token or not r.get("data"):
                break
    print(name, n, flush=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    import sys
    for name, addr in WALLETS.items():
        if len(sys.argv) == 1 or name in sys.argv[1:]:
            pull(name, addr)
