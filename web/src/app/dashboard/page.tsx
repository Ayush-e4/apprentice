import type { Metadata } from "next";
import Benchmarks from "@/components/dashboard/Benchmarks";
import HealthDots from "@/components/dashboard/HealthDots";
import LiveTraces from "@/components/dashboard/LiveTraces";
import LiveStats from "@/components/overview/LiveStats";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Dashboard" title="How the gateway is doing">
          Benchmark runs, live traffic and the health of each model.
        </PageHeader>
        <div className="mb-6 empty:hidden">
          <HealthDots />
        </div>
      </div>
      <LiveStats />
      <Benchmarks />
      <LiveTraces />
    </div>
  );
}
