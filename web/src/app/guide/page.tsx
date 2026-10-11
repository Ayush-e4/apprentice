import type { Metadata } from "next";
import GuideBody from "@/components/guide/GuideBody";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Guide",
  description: "What Apprentice is, how to connect it to your own Claude through MCP, and how to run your own gateway.",
};

export default function GuidePage() {
  return (
    <>
      <PageHeader eyebrow="Developer guide" title="Put Apprentice in your Claude">
        Connect Claude Code, Claude Desktop or Cursor to an Apprentice gateway in two commands, call it from your own app
        with the OpenAI SDK, or run the whole stack yourself.
      </PageHeader>
      <GuideBody />
    </>
  );
}
