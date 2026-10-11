import type { Metadata } from "next";
import SupportApp from "@/components/support/SupportApp";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "QuickBite Support" };

export default function SupportPage() {
  return (
    <>
      <PageHeader eyebrow="QuickBite Support" title="A help desk that gets cheaper as it learns">
        QuickBite is a fictional food-delivery app. New questions go to the teacher, and each answer is remembered. When a
        customer asks something similar, the small student model answers on its own, for free.
      </PageHeader>
      <SupportApp />
    </>
  );
}
