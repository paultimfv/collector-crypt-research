import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Barlow for reading; the condensed cut for figures and the slab label, like a grading label
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const cond = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-cond" });

export const metadata: Metadata = {
  title: "Collector Crypt research",
  description: "Independent onchain research on Collector Crypt: gacha pack sales, card buybacks, storefronts, whales and the CARDS token, read straight from Solana, Base and Robinhood Chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${cond.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
