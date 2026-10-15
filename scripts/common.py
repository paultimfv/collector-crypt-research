"""Shared helpers: Helius RPC client, retries, base58 decoding."""
import os, time, json, random, requests, base58
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
HELIUS = f"https://mainnet.helius-rpc.com/?api-key={os.environ['HELIUS_KEY']}"
# Alchemy serves the same methods (incl. getTransactionsForAddress); used as a second lane when set
ENDPOINTS = [HELIUS] + ([f"https://solana-mainnet.g.alchemy.com/v2/{os.environ['ALCHEMY_KEY']}"]
                        if os.environ.get("ALCHEMY_KEY") else [])
S = requests.Session()


def rpc(method, params, tries=8):
    i, k, limited = 0, random.randrange(len(ENDPOINTS)), 0
    while True:
        try:
            r = S.post(ENDPOINTS[k], json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=120)
            if r.status_code == 429:  # rate limited: try the other provider, wait only once both are busy
                k, limited = (k + 1) % len(ENDPOINTS), limited + 1
                if limited % len(ENDPOINTS) == 0:
                    time.sleep(0.3 + random.random())
                continue
            if r.status_code >= 500:
                raise RuntimeError(f"http {r.status_code}")
            j = r.json()
            if "error" in j:
                raise RuntimeError(j["error"])
            return j["result"]
        except Exception:
            i += 1
            if i >= tries:
                raise
            k = (k + 1) % len(ENDPOINTS)
            time.sleep(min(2 ** i, 30))


def txs_for_address(addr, gte, lt, token=None):
    """One page (<=100) of full successful txs touching addr in [gte, lt), oldest first."""
    opts = {"transactionDetails": "full", "limit": 100, "sortOrder": "asc", "encoding": "json",
            "maxSupportedTransactionVersion": 1,
            "filters": {"blockTime": {"gte": gte, "lt": lt}, "status": "succeeded"}}
    if token:
        opts["paginationToken"] = token
    r = rpc("getTransactionsForAddress", [addr, opts])
    return r.get("data", []), r.get("paginationToken")


def keys_of(tx):
    m = tx["transaction"]["message"]
    la = tx["meta"].get("loadedAddresses") or {}
    return m["accountKeys"] + la.get("writable", []) + la.get("readonly", [])


def inner_ixs(tx):
    keys = keys_of(tx)
    for g in tx["meta"].get("innerInstructions") or []:
        for ix in g["instructions"]:
            yield keys[ix["programIdIndex"]], base58.b58decode(ix["data"])


def top_ixs(tx):
    keys = keys_of(tx)
    for ix in tx["transaction"]["message"]["instructions"]:
        yield keys[ix["programIdIndex"]], base58.b58decode(ix["data"]), [keys[a] for a in ix["accounts"]]
