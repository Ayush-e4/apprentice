import { BlurFade } from "@/components/magicui/blur-fade";
import DemoWindows from "@/components/overview/DemoWindows";
import Hero from "@/components/overview/Hero";
import HowItWorks from "@/components/overview/HowItWorks";
import LiveStats from "@/components/overview/LiveStats";
import Results from "@/components/overview/Results";
import { SectionTitle } from "@/components/ui";

export default function Home() {
  return (
    <>
      <Hero />

      <section aria-labelledby="how-title" className="border-b border-rule py-16 sm:py-[4.5rem]">
        <BlurFade>
          <SectionTitle
            id="how-title"
            index="01"
            title="How it works"
            subtitle="Two lanes. Most requests take the top one and never leave the laptop."
          />
        </BlurFade>
        <BlurFade delay={0.1}>
          <HowItWorks />
        </BlurFade>
      </section>

      <section id="results" aria-labelledby="results-title" className="scroll-mt-20 border-b border-rule py-16 sm:py-[4.5rem]">
        <BlurFade>
          <SectionTitle
            id="results-title"
            index="02"
            title="Results"
            subtitle="Text-to-SQL, 80 held-out questions. Student: Qwen3 1.7B on a laptop GPU. Teacher: GLM-5.2. Measured, not estimated."
          />
        </BlurFade>
        <Results />
      </section>

      <section aria-labelledby="demos-title" className="border-b border-rule py-16 sm:py-[4.5rem]">
        <BlurFade>
          <SectionTitle id="demos-title" index="03" title="Live demos" subtitle="Two apps on the same gateway idea." />
        </BlurFade>
        <DemoWindows />
      </section>

      <div className="py-16 sm:py-[4.5rem]">
        <BlurFade>
          <LiveStats index="04" />
        </BlurFade>
      </div>
    </>
  );
}
