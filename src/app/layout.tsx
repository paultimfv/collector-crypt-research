import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Ask from "@/components/ask";
import "./globals.css";

// Archivo across its width axis: condensed and heavy for figures (like the print on a grading label), normal width for reading
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "Collector Crypt dashboard",
  description: "Collector Crypt gacha pack sales, buybacks and the CARDS token, read directly from the chain.",
};

const THEME_INIT = `try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="antialiased">{children}<Ask site="collector-crypt" title="Collector Crypt" suggestions={["How much did pack sales bring in over the last 30 days?", "What share of sales goes back out as buybacks?", "How concentrated are buyers?"]} /></body>
    </html>
  );
}
