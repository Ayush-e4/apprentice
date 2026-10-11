import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Apprentice", template: "%s · Apprentice" },
  description:
    "A small local model answers first, a judge checks it, a large teacher steps in when needed, and the student learns from every correction.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow dark:focus:bg-zinc-900"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-zinc-200/80 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          Apprentice · open models, local first · MIT licensed
        </footer>
      </body>
    </html>
  );
}
