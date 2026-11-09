"""Pull the EVM gacha contract's money flows on Base and Robinhood Chain.

Robinhood Chain: plain eth_getLogs on the public RPC (100k-block ranges since Nov 2026) for
  Paid(address indexed payer, address indexed token, uint256 amount, string memo)       -> pack purchase
  SoldBack(address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 nonce) -> card sold back
Base: free public RPCs refuse historical getLogs, so Base uses Alchemy getAssetTransfers instead:
  ERC-20 transfers into the contract (purchases) and out of it (sell-back payouts).
Writes data/raw/evm_<chain>.csv (full rewrite; both sets are small).
"""
import csv, os, time, datetime as dt, requests
from Crypto.Hash import keccak
from common import ROOT
from addresses import EVM_GACHA

RH_RPC = os.environ.get("RH_RPC_URL", "https://rpc.mainnet.chain.robinhood.com")
ALCHEMY_BASE = f"https://base-mainnet.g.alchemy.com/v2/{os.environ.get('ALCHEMY_KEY', '')}"
COLS = ["ts", "event", "who", "token", "amount", "extra", "tx"]


def topic(sig):
    return "0x" + keccak.new(digest_bits=256, data=sig.encode()).hexdigest()


PAID = topic("Paid(address,address,uint256,string)")
SOLD = topic("SoldBack(address,uint256,uint256,uint256)")


def call(url, method, params):
    for i in range(8):
        try:
            j = requests.post(url, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=90).json()
            if "error" in j:
                raise RuntimeError(j["error"])
            return j["result"]
        except Exception:
            if i == 7:
                raise
            time.sleep(2 ** i)


def deploy_block(url, head):
    lo, hi = 0, head
    while lo < hi:
        mid = (lo + hi) // 2
        if call(url, "eth_getCode", [EVM_GACHA, hex(mid)]) not in ("0x", "0x0"):
            hi = mid
        else:
            lo = mid + 1
    return lo


def block_at(url, ts, head):
    """First block at or after unix time ts (binary search on block timestamps)."""
    lo, hi = 0, head
    while lo < hi:
        mid = (lo + hi) // 2
        if int(call(url, "eth_getBlockByNumber", [hex(mid), False])["timestamp"], 16) < ts:
            lo = mid + 1
        else:
            hi = mid
    return lo


def pull_robinhood():
    head = int(call(RH_RPC, "eth_blockNumber", []), 16)
    # Incremental: keep the rows on file and resume an hour before the newest one (duplicates dropped below).
    # First run: a few days before the machine's 2026-09-25 launch, found by block timestamp
    # (the RPC keeps no historical state, so no getCode search).
    path = ROOT / "data/raw/evm_robinhood.csv"
    old = []
    if path.exists():
        with open(path, newline="") as f:
            old = [r for r in csv.reader(f)][1:]
    since = max((int(r[0]) for r in old), default=1789862400 + 3600) - 3600
    start, step = block_at(RH_RPC, since, head), 100_000   # the public RPC caps eth_getLogs at 100k blocks (Nov 2026)
    print(f"robinhood: {len(old):,} rows on file, scanning blocks {start:,} -> {head:,}", flush=True)
    rows, ts_cache, b = [[int(r[0])] + r[1:] for r in old], {}, start
    while b <= head:
        e = min(b + step - 1, head)
        # one topic per query: the RPC only allows 2M-block ranges with a single value per topic position
        logs = [lg for t0 in (PAID, SOLD)
                for lg in call(RH_RPC, "eth_getLogs", [{"address": EVM_GACHA, "fromBlock": hex(b), "toBlock": hex(e), "topics": [t0]}])]
        for lg in logs:
            bn = int(lg["blockNumber"], 16)
            if bn not in ts_cache:
                ts_cache[bn] = int(call(RH_RPC, "eth_getBlockByNumber", [hex(bn), False])["timestamp"], 16)
            data = lg["data"][2:]
            if lg["topics"][0] == PAID:
                off = int(data[64:128], 16) * 2
                ln = int(data[off:off + 64], 16)
                memo = bytes.fromhex(data[off + 64: off + 64 + ln * 2]).decode(errors="replace")
                rows.append([ts_cache[bn], "paid", "0x" + lg["topics"][1][-40:], "0x" + lg["topics"][2][-40:],
                             int(data[0:64], 16) / 1e6, memo, lg["transactionHash"]])
            else:
                rows.append([ts_cache[bn], "soldback", "0x" + lg["topics"][1][-40:], "", int(data[0:64], 16) / 1e6,
                             int(lg["topics"][2], 16), lg["transactionHash"]])
        b = e + 1
    seen, out = set(), []
    for r in rows:   # drop the overlap re-read from the last hour
        k = (r[6], r[1], str(r[2]).lower(), str(r[5]))
        if k not in seen:
            seen.add(k); out.append(r)
    return out


def pull_base():
    rows = []
    for direction in ("toAddress", "fromAddress"):
        page = None
        while True:
            p = {"fromBlock": "0x0", "toBlock": "latest", "category": ["erc20"], "withMetadata": True,
                 "maxCount": "0x3e8", "order": "asc", direction: EVM_GACHA}
            if page:
                p["pageKey"] = page
            r = call(ALCHEMY_BASE, "alchemy_getAssetTransfers", [p])
            for t in r["transfers"]:
                ts = int(dt.datetime.fromisoformat(t["metadata"]["blockTimestamp"].replace("Z", "+00:00")).timestamp())
                if direction == "toAddress":
                    rows.append([ts, "paid", t["from"], t["asset"], t["value"], "", t["hash"]])
                else:
                    rows.append([ts, "soldback", t["to"], t["asset"], t["value"], "", t["hash"]])
            page = r.get("pageKey")
            if not page:
                break
    return rows


if __name__ == "__main__":
    for chain, fn in (("robinhood", pull_robinhood), ("base", pull_base)):
        rows = sorted(fn(), key=lambda r: r[0])
        with open(ROOT / f"data/raw/evm_{chain}.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(COLS)
            w.writerows(rows)
        print(chain, len(rows), flush=True)
