# collector-crypt-research

Dashboard and onchain data pipeline for Collector Crypt (gacha pack sales, card buybacks, CARDS buyback and burn).

Live: https://collector-crypt-dashboard-delta.vercel.app

## Data

| Data | Source | Refresh |
|---|---|---|
| Pack sales, card buybacks | USDC, USDT, JupUSD and CASH transfers in and out of the gacha wallet, Helius and Alchemy RPC | daily |
| Storefront, pack price | Memo on each payment (`store-id:open` / `:buyback`) | daily |
| CARDS buyback and burns | Buyback bot and burn wallet transfers, CARDS mint supply | daily |
| EVM pack sales | Gacha contract logs on Base (Alchemy) and Robinhood Chain (RPC) | daily |

Addresses are in `scripts/addresses.py` and on the dashboard. Method details: `PIPELINE.md`.

## Layout

```
scripts/pull_gacha.py      gacha wallet transfers -> data/raw/gacha/YYYY-MM-DD.csv
scripts/pull_wallets.py    buyback bot, burn wallet, treasury -> data/raw/wallets/
scripts/pull_evm.py        Base and Robinhood Chain logs -> data/raw/evm_*.csv
scripts/build_cards.py     data/raw -> src/data/cards.json
src/                       Next.js app
.github/workflows/daily.yml
```

## Run

```
python -m venv .venv && .venv/bin/pip install -r requirements.txt
printf "HELIUS_KEY=...\nALCHEMY_KEY=...\n" > .env
cd scripts && ../.venv/bin/python pull_gacha.py 2024-11-21 6 && ../.venv/bin/python pull_wallets.py && ../.venv/bin/python pull_evm.py && ../.venv/bin/python build_cards.py
cd .. && npm install && npm run dev
```
