// Blur Fade, from Magic UI: https://magicui.design/docs/components/blur-fade
// Copied from the registry (https://magicui.design/r/blur-fade.json). MIT License, (c) Magic UI.
// Adapted for Apprentice: reveals on scroll by default with a lighter blur, and only fades
// (no movement, no blur) when the user prefers reduced motion.
"use client";

import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type MotionProps,
  type UseInViewOptions,
  type Variants,
} from "motion/react";

type MarginType = UseInViewOptions["margin"];

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  inView?: boolean;
  inViewMargin?: MarginType;
  blur?: string;
}

const getFilter = (v: Variants[string]) => (typeof v === "function" ? undefined : v.filter);

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.5,
  delay = 0,
  offset = 12,
  direction = "up",
  inView = true,
  inViewMargin = "-60px",
  blur = "4px",
  ...props
}: BlurFadeProps) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const sign = direction === "right" || direction === "down" ? -1 : 1;
  const defaultVariants: Variants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { [axis]: sign * offset, opacity: 0, filter: `blur(${blur})` },
        visible: { [axis]: 0, opacity: 1, filter: "blur(0px)" },
      };
  const combinedVariants = variant ?? defaultVariants;

  const hiddenFilter = getFilter(combinedVariants.hidden);
  const visibleFilter = getFilter(combinedVariants.visible);
  const shouldTransitionFilter = hiddenFilter != null && visibleFilter != null && hiddenFilter !== visibleFilter;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: [0.2, 0, 0, 1],
          ...(shouldTransitionFilter ? { filter: { duration } } : {}),
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
