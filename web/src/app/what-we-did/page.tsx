import type { Metadata } from "next";
import Numbers from "@/components/built/Numbers";
import Shipped from "@/components/built/Shipped";
import Savings from "@/components/built/Savings";
import AtScale from "@/components/built/AtScale";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "What we did",
  description: "Everything we built for Apprentice in one day, with the numbers, and what it could do at production scale.",
};

export default function WhatWeDidPage() {
  return (
    <>
      <PageHeader eyebrow="Hacktoberfest 2026 · Mumbai · one day" title="What we built in a day">
        From an empty repo at 11:48 to a working gateway, two trained models, two demo apps, an MCP server and a live
        public demo. Every number on this page comes from the repo, the CI history or a real eval run.
      </PageHeader>
      <Numbers />
      <Shipped />
      <Savings />
      <AtScale />
    </>
  );
}
