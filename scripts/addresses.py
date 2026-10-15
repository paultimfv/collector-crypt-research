"""Collector Crypt address book (Solana + EVM).

Sources: docs.collectorcrypt.com (CARDS token page, gacha API, cc-buyback, VRF pages) and, for the
older sink, team wallets and the fiat rail, the open-source DefiLlama adapter
(dimension-adapters/fees/collector-crypt). Every address here was checked onchain before use.
"""

USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
STABLES = {  # every payment lane counted at $1
    USDC: "USDC",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
    "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD": "JupUSD",
    "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH": "CASH",
    "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH": "USDG",
}
CARDS = "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp"

GACHA_SINKS = {
    "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3": "Gacha wallet (since 2025-12-07)",
    "GachazZscHZ5bn3vnq1yEC4zpYdhAYJBzuKJwSJksc9z": "Gacha wallet (2025-06 to 2025-12)",
}
GACHA_USDC_ACCOUNT = "D9CEogjHA6CpS12F8St9zpSco7pQKJB5uR1RqDsuzQZk"
FIAT_RAIL = "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s"
ROYALTY = "DQPERZ9e86pNJ4mhUnCEP8V75yxZofsipoVrRWT5Wdxd"
TREASURY = "3PnVBrb4wPLFLW38oaYR7dA6HSfKpawxHGESPj5kF1QB"     # Squads multisig
BUYBACK_BOT = "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq"
BURN_WALLET = "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4"  # receives bought-back CARDS, burns them in batches (found onchain)
CARDS_USDC_POOL = "HnhpJPJgBG2KwniMTNW8cVBHvk1hFog3RC3kjnyc23tD"  # Raydium CLMM
RAYDIUM_CLMM = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
CC_BUYBACK = "CcBuyM7sDhedBGLZxivBvgZVdqzrQAG66KYHgnTTEpLF"
CC_VRF = "ccvrfu3fSpbnPLiUqdWAt85Zn9nq96ekwGTbHqGtdgQ"
STREAMFLOW = "strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m"

TEAM = {
    "BAxTk97HsaJqbnbFmTiQTaL4KSRvJ8Y65ArZCsP6vA5M", "21KhtC7y2JGYvwc8dcGqTdbrudbM8fgMPJsVwxRQqdY8",
    "DFEstpYN3fsz93AC9v2ujzPPngPgodqH2xxopuyfSsAE", "HW2HRqN1pXQGH9GfP9xet4XwqtLqFyYGDNRKjUAVgh9u",
    "HighJBfnAaqH9cKkeMErQFJZ4ATxQJwxqFupX6zaKTns", "LGNDXqcm6U57QQ6Ad7icZ6oizkAVKRWrw97KwZy5nVf",
    "EpicWWZspT1trKndbDDr29ULViN56rN5vofWSKZp8ePF", "Mid9NeCpPNxP59fAdsLgMLy7BYexxXFw52ZP58Jrney",
    "Lowq9dkpY43VpjfYeRjtKfGA6JtB7HaMmwQgXkjHLvN", "Low6UekJP3QrFVMfNRTL8CPK2SiGFhvp57sgF2pkmVu",
    "miDtj3vgdxVykHzRyFwyG8MXpvK8eQqamSLVdBr7WPt", "HiGHqwYddP5N2waqUmXPdaASpMpUEvfqPr2fSawctEb",
    "epiC3zkqa1RfcPMMM1Kc8m3GZGDwF2RmjbfA3g1BBjn", "LGNDfXQFMiRMz3qqTNAREmRFQutMvazqqRrzn5i98uj",
    "SPrT7eFrCM9UJ4j7Xf9iktKCoBwJjfykFbiNbRsKQm8", "Cc4pHGnoaRWL1WnHsV517T3YvQn5gLDBMiuVXkF9rZhK",
    "8373hLiAEXxaJ3oV7SRzx4KHwurEg9rEG98tUPj1sdtX", "onePMfirJs2Rx3eixoPnjY6NHiaC74pkQ2k313K2Lxs",
    "SportGmqffp9zC3VZV7Wwz6s2nCkEB5Q3nVwKGU4esD", "DQPERZ9e86pNJ4mhUnCEP8V75yxZofsipoVrRWT5Wdxd",
    "cc3novbXuNSe292qKH2gGhxToaWjuBvJbA7zQf8NVxi", "GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3",
    "GachazZscHZ5bn3vnq1yEC4zpYdhAYJBzuKJwSJksc9z", "96DULv1BqYfe5wyMr6pVUNC6Uyrtj6yr3tNi6VtfwW9s",
    "jrS7Pbn38wKiPsXbyNhGCr3icfXuJxdytZr1N4TwdFu", "3nGNwiz1qevPjhEoQi1dLj16oTkjmbevTnpV9piWY7Kq",
    "3PnVBrb4wPLFLW38oaYR7dA6HSfKpawxHGESPj5kF1QB", "BLuefR7NzdAu9dTUp43dzAnDW9EcCXwM4w2i3sT132z4",
}

# EVM gacha contract (same address on Base and Robinhood Chain)
EVM_GACHA = "0x4d56B148624e17FD53c08D1C4998e8e3945bDE28"
EVM_TEAM = {
    "0x712b45b8a65a17888105e20a110101791fd102a5", "0x9794b4215a437d4468b7d1a1b4da1d3cf607feec",
    "0x934edb099ff7d5b861dd65b64dc735ac986c0956", "0x6903e3e3621d9fce7acfb9714da61bc03a60aa00",
    "0x1f4b1a9f43fb7be7923a9f48b12ac23cb377702b",
}
