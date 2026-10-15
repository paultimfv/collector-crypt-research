# Collector Crypt dashboard: how the data works

## The one-paragraph version

Collector Crypt runs gacha machines for graded trading cards. A player pays USDC for a pack, a VRF draw picks
a vaulted PSA-graded card, and the card arrives as an NFT that the player can keep or sell straight back to
the machine. All of that money moves through one Solana wallet. This dashboard rebuilds every pack payment and
every buyback from that wallet's transactions, reads the storefront from each transaction's memo, and follows
the cut the machine keeps into the CARDS buyback and burn.

## The picture

```
 SOURCES                                        PIPELINE (Python, daily on GitHub)          DASHBOARD

 Solana gacha wallet stablecoin accounts ──────► pull_gacha.py ─► data/raw/gacha/DAY.csv ─┐
   (Helius + Alchemy getTransactionsForAddress)                                           │
 Buyback bot, burn wallet, treasury,                                                      │
   card-payment rail, royalty collector ───────► pull_wallets.py ─► data/raw/wallets/*.csv ├► build_cards.py ─► src/data/cards.json
 Robinhood Chain gacha (Paid/SoldBack logs) ───► pull_evm.py ─► data/raw/evm_robinhood.csv │
 Base gacha (Alchemy asset transfers) ─────────► pull_evm.py ─► data/raw/evm_base.csv ─────┘
```

## Rules

1. Stablecoins (USDC, USDT, JupUSD, CASH, USDG) count at $1.
2. Transfers between Collector Crypt's own wallets are internal. The team list is in `scripts/addresses.py`.
3. Pack sale = stablecoin into a gacha wallet from anyone else. Buyback = stablecoin out of it to anyone else.
4. Storefront = memo prefix (`cc-<uuid>:open`, `jupiter-<uuid>:open`, `slabz-…`). Price tier = payment amount.
5. Card-payment purchases are counted when they land in the card-payment wallet, not when forwarded.
6. EVM: `Paid` events are sales, `SoldBack` events are buybacks (Robinhood Chain); on Base, USDC into and out of
   the contract, because free Base RPCs refuse historical getLogs.

## Where the addresses come from

- docs.collectorcrypt.com: CARDS mint, treasury, buyback wallet, gacha USDC account, cc-buyback and cc-vrf programs.
- DefiLlama's open-source adapter (dimension-adapters/fees/collector-crypt): the old gacha wallet, the card-payment
  rail, the royalty wallet, the team list and the EVM contract. Used as an address book only, not as data.
- Found onchain: the burn wallet `BLuefR7N…`, which receives the CARDS the bot buys and burns them in batches.

## Checks

- CARDS burned by the burn wallet vs the drop in the mint's supply below 2,000,000,000: within about 1%.

## Known limits

- The Solana gacha history is pulled newest-first, about 60,000 transfers per busy day. The dashboard states the
  exact date range it covers; each daily run extends it backwards until it reaches the first sale (Nov 2024).
- "Kept" is before the cost of the physical cards, so it is not profit.
- An unlabelled team wallet would make an internal transfer look like a sale or a buyback.

## Running it

```
cd scripts
python pull_wallets.py                         # incremental
python pull_evm.py                             # full rewrite, small
python pull_gacha.py 2024-11-21 6 --budget 75  # newest days first, resumable
python build_cards.py
```
Needs `HELIUS_KEY` and `ALCHEMY_KEY` in `.env` or as GitHub secrets.
