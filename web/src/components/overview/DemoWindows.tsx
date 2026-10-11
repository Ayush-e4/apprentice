// The two live demos, shown as product windows that link to the apps. A slow Border Beam (Magic UI)
// runs around each frame in its lane colour. Numbers are from the README's real-model support run.

import Link from "next/link";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ServedPill } from "@/components/ServedBadge";
import ShareMeter from "@/components/ShareMeter";
import { Window } from "@/components/ui";

function Cta({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="btn btn-ink w-full justify-between sm:w-auto">
      {children}
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M2 8h11M9 4l4 4-4 4" />
      </svg>
    </Link>
  );
}

export default function DemoWindows() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <BlurFade>
        <Window heading="h3" title="Kirana Copilot" caption="shop data · Mumbai">
          <BorderBeam size={90} duration={10} />
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <p className="ml-auto max-w-[85%] bg-ink px-4 py-3 leading-relaxed text-paper">
              March 2026 mein sabse zyada orders kis store pe aaye?
            </p>
            <p className="leading-relaxed text-body">
              A shop owner asks about sales in English or Hinglish and gets the number or a table, not SQL. Every answer
              says who wrote it, what the judge thought, how long it took and what it cost.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <ServedPill servedBy="student" />
              <ServedPill servedBy="teacher" />
              <span className="border border-rule-strong px-2 py-1 font-mono text-xs text-body">Why + SQL</span>
            </div>
          </div>
          <div className="border-t border-ink p-4 sm:p-5">
            <Cta href="/kirana">Ask the shop</Cta>
          </div>
        </Window>
      </BlurFade>
      <BlurFade delay={0.1}>
        <Window heading="h3" title="QuickBite Support" caption="fictional brand · food delivery">
          <BorderBeam size={90} duration={10} delay={5} colorFrom="#B54708" colorTo="#B54708" />
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <p className="ml-auto max-w-[85%] bg-ink px-4 py-3 leading-relaxed text-paper">How do I cancel my order?</p>
            <p className="leading-relaxed text-body">
              A food-delivery help desk. New questions go to the teacher and are remembered; when a customer asks
              something similar, the student answers on its own, for free.
            </p>
          </div>
          <div className="flex flex-col gap-5 border-t border-ink p-4 sm:p-5">
            <ShareMeter share={0.6} title="Student share · 30 customers, real models" />
            <p className="font-mono text-xs text-muted">18 of 30 answered locally · $0.025 total</p>
            <Cta href="/support">Open the help desk</Cta>
          </div>
        </Window>
      </BlurFade>
    </div>
  );
}
