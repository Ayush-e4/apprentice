// One numbered guide section: an anchor id for deep links, the shared SectionTitle and a Blur Fade
// reveal (which only fades under reduced motion). Also a compact two-or-three column table.

import type { ReactNode } from "react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { SectionTitle } from "@/components/ui";

export default function Section({
  id,
  index,
  title,
  subtitle,
  children,
}: {
  id: string;
  index: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-20 border-b border-rule py-14 last:border-b-0 sm:py-16">
      <BlurFade>
        <SectionTitle id={`${id}-title`} index={index} title={title} subtitle={subtitle} />
      </BlurFade>
      <BlurFade delay={0.08}>{children}</BlurFade>
    </section>
  );
}

export function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-4 border-t border-ink pt-5 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <p className="label-mono pt-1">Step {n}</p>
      <div className="flex min-w-0 flex-col gap-4">
        <h3 className="text-xl font-bold tracking-[-0.02em]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function DataTable({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption: string }) {
  return (
    <div className="min-w-0 overflow-x-auto border border-ink" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-ink bg-wash">
            {head.map((h) => (
              <th key={h} scope="col" className="label-mono px-4 py-2.5 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-rule align-top last:border-b-0">
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "whitespace-nowrap px-4 py-2.5 font-mono text-[0.8125rem]" : "px-4 py-2.5 text-body"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="bg-wash px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}
