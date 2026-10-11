"use client";

// "How it works": five boxes on a precise grid, joined by black 1px rules with beams travelling
// along them (Magic UI Animated Beam). Blue beams are the local lane, orange beams the teacher lane.
// Phones get a 2-column arrangement where every connection is still between neighbouring boxes.

import { useRef, type ReactNode, type RefObject } from "react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { LocalMark, TeacherMark } from "@/components/Markers";
import { cn } from "@/lib/utils";

const BLUE = "#1F4BFF";
const ORANGE = "#B54708";

function Box({
  boxRef,
  code,
  title,
  body,
  className,
  variant = "plain",
}: {
  boxRef: RefObject<HTMLDivElement | null>;
  code: string;
  title: string;
  body: string;
  className?: string;
  variant?: "plain" | "local" | "teacher" | "memory" | "out";
}) {
  return (
    <div
      ref={boxRef}
      className={cn(
        "relative z-10 flex flex-col gap-1.5 p-3 sm:p-5",
        variant === "out" ? "bg-ink text-paper" : "border border-ink bg-paper",
        variant === "local" && "border-t-4 border-t-local",
        variant === "teacher" && "border-t-4 border-t-teacher",
        variant === "memory" && "border-dashed",
        className,
      )}
    >
      <span className={cn("font-mono text-[0.6875rem] sm:text-xs", variant === "out" ? "text-rule-strong" : "text-muted")}>
        {code}
      </span>
      <strong className="text-base leading-tight tracking-[-0.02em] sm:text-[1.375rem]">{title}</strong>
      <span className={cn("text-[0.8125rem] leading-snug sm:text-[0.9375rem]", variant === "out" ? "text-rule-strong" : "text-soft")}>
        {body}
      </span>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2 font-mono text-xs text-soft">{children}</span>;
}

export default function HowItWorks() {
  const container = useRef<HTMLDivElement>(null);
  const student = useRef<HTMLDivElement>(null);
  const verify = useRef<HTMLDivElement>(null);
  const answer = useRef<HTMLDivElement>(null);
  const teacher = useRef<HTMLDivElement>(null);
  const memory = useRef<HTMLDivElement>(null);

  const beams: { from: RefObject<HTMLDivElement | null>; to: RefObject<HTMLDivElement | null>; color: string; delay: number }[] = [
    { from: student, to: verify, color: BLUE, delay: 0 },
    { from: verify, to: answer, color: BLUE, delay: 0.9 },
    { from: verify, to: teacher, color: ORANGE, delay: 1.8 },
    { from: teacher, to: memory, color: ORANGE, delay: 2.7 },
    { from: memory, to: student, color: BLUE, delay: 3.6 },
  ];

  return (
    <div>
      <div
        ref={container}
        className="relative grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 md:gap-x-[4.5rem] md:gap-y-[4.5rem]"
        role="img"
        aria-label="A request goes to the student. The SQL check and the judge verify its answer. If it passes, the answer goes back. If it fails, the teacher answers, and that answer is saved to memory, which the student uses next time."
      >
        <Box
          boxRef={student}
          code="A1 / LOCAL"
          title="Student"
          body="Qwen3 1.7B answers first, with remembered examples."
          variant="local"
          className="col-start-1 row-start-1"
        />
        <Box
          boxRef={verify}
          code="A2 / VERIFY"
          title="SQL check + trained judge"
          body="The query must run; Kev-0.8B scores the answer."
          className="col-start-1 row-start-2 md:col-start-2 md:row-start-1"
        />
        <Box
          boxRef={answer}
          code="A3 / OUT · PASS"
          title="Answer"
          body="Returned on the OpenAI-compatible endpoint."
          variant="out"
          className="col-start-1 row-start-3 md:col-start-3 md:row-start-1"
        />
        <Box
          boxRef={teacher}
          code="B1 / ESCALATE · FAIL"
          title="Teacher"
          body="GLM-5.2 answers, and teaches."
          variant="teacher"
          className="col-start-2 row-start-2"
        />
        <Box
          boxRef={memory}
          code="B2 / STORE"
          title="Memory"
          body="The teacher's answer is saved and retrieved for the student next time."
          variant="memory"
          className="col-start-2 row-start-1 md:col-start-1 md:row-start-2"
        />
        {beams.map((b, i) => (
          <AnimatedBeam
            key={i}
            containerRef={container}
            fromRef={b.from}
            toRef={b.to}
            gradientStartColor={b.color}
            gradientStopColor={b.color}
            duration={2.2}
            delay={b.delay}
            repeatDelay={2.4}
          />
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-rule pt-4">
        <Key>
          <LocalMark className="text-local" /> PASS: the answer never leaves the laptop
        </Key>
        <Key>
          <TeacherMark className="text-teacher" /> FAIL: the teacher answers, and memory keeps it
        </Key>
      </div>
    </div>
  );
}
