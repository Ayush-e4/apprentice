// Border Beam, from Magic UI: https://magicui.design/docs/components/border-beam
// Copied from the registry (https://magicui.design/r/border-beam.json). MIT License, (c) Magic UI.
// Adapted for Apprentice: brand colours by default, square corners on the travel path, and nothing
// is rendered when the user prefers reduced motion (the frame's own 1px border stays).
"use client";

import { motion, useReducedMotion, type MotionStyle, type Transition } from "motion/react";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  /** Length of the beam in px. */
  size?: number;
  /** Seconds per lap. */
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  /** Initial offset position (0-100). */
  initialOffset?: number;
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 80,
  delay = 0,
  duration = 9,
  colorFrom = "#1F4BFF",
  colorTo = "#1F4BFF",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 2,
}: BorderBeamProps) => {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    // The outer box clips the travelling square so it never widens the page.
    <div aria-hidden className="pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit]">
    <div
      className="absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"
      style={{ "--border-beam-width": `${borderWidth}px` } as React.CSSProperties}
    >
      <motion.div
        className={cn(
          "absolute aspect-square",
          "bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: "rect(0 auto auto 0)",
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{ repeat: Infinity, ease: "linear", duration, delay: -delay, ...transition }}
      />
    </div>
    </div>
  );
};
