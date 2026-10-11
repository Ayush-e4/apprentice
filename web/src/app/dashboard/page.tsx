import type { Metadata } from "next";
import Benchmarks from "@/components/dashboard/Benchmarks";
import HealthDots from "@/components/dashboard/HealthDots";
import LiveTraces from "@/components/dashboard/LiveTraces";
import { BlurFade } from "@/components/magicui/blur-fade";
import LiveStats from "@/components/overview/LiveStats";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Dashboard" title="How the gateway is doing">
        Benchmark runs, live traffic and the health of each model.
        <div className="mt-5 empty:hidden">
          <HealthDots />
        </div>
      </PageHeader>
      <div className="flex flex-col gap-16 pt-12 sm:gap-[4.5rem]">
        <BlurFade>
          <LiveStats index="01" />
        </BlurFade>
        <BlurFade>
          <Benchmarks />
        </BlurFade>
        <BlurFade>
          <LiveTraces />
        </BlurFade>
      </div>
    </>
  );
}
