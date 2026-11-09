"""Shared helpers: Solana RPC client (Alchemy first, Helius fallback), retries, base58 decoding."""
import os, time, json, random, requests, base58
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
# Alchemy serves the same methods as Helius, including getTransactionsForAddress. An endpoint that answers
# "max usage reached" (plan credits exhausted) is dropped for the rest of the run instead of retried forever.
ENDPOINTS = ([f"https://solana-mainnet.g.alchemy.com/v2/{os.environ['ALCHEMY_KEY']}"] if os.environ.get("ALCHEMY_KEY") else []) \
          + ([f"https://mainnet.helius-rpc.com/?api-key={os.environ['HELIUS_KEY']}"] if os.environ.get("HELIUS_KEY") else [])
if not ENDPOINTS:
    raise SystemExit("set ALCHEMY_KEY (or HELIUS_KEY) in .env")
S = requests.Session()


def rpc(method, params, tries=8):
    i, limited = 0, 0
    while True:
        if not ENDPOINTS:
            raise RuntimeError("every Solana RPC endpoint is out of credits")
        url = ENDPOINTS[0]
        try:
            r = S.post(url, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=120)
            if r.status_code == 429 and "max usage" in r.text.lower():
                ENDPOINTS.remove(url); print(f"  rpc: {url.split('/')[2]} is out of credits, dropping it"); continue
            if r.status_code == 429:  # rate limited: rotate, short jittered wait once every endpoint is busy
                ENDPOINTS.append(ENDPOINTS.pop(0)); limited += 1
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
            if len(ENDPOINTS) > 1:
                ENDPOINTS.append(ENDPOINTS.pop(0))
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
