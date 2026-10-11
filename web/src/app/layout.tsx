import type { Metadata, Viewport } from "next";
import { Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Apprentice", template: "%s · Apprentice" },
  description:
    "A small local model answers first, a judge checks it, a large teacher steps in when needed, and the student learns from every correction.",
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:border focus:border-ink focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <Providers>
          <Nav />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
