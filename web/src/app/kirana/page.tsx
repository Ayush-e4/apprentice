import type { Metadata } from "next";
import KiranaChat from "@/components/kirana/KiranaChat";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Kirana Copilot" };

export default function KiranaPage() {
  return (
    <>
      <PageHeader eyebrow="Kirana Copilot" title="Ask your shop anything">
        Questions run through the gateway: the student writes the query, the SQL check and the judge decide if it is right,
        and the teacher steps in when it isn&apos;t. The query runs read-only on the shop database.
      </PageHeader>
      <KiranaChat />
    </>
  );
}
