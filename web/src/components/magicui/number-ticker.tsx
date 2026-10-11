// Number Ticker, from Magic UI: https://magicui.design/docs/components/number-ticker
// Copied from the registry (https://magicui.design/r/number-ticker.json). MIT License, (c) Magic UI.
// Adapted for Apprentice: no colour or tracking defaults (the caller sets type), the final value is
// rendered straight away when the user prefers reduced motion, and the in-view margin is configurable.
"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
}

function format(n: number, decimalPlaces: number) {
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(n.toFixed(decimalPlaces)));
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isInView) {
      timer = setTimeout(() => motionValue.set(direction === "down" ? startValue : value), delay * 1000);
    }
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [motionValue, isInView, delay, value, direction, startValue, reduce]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current && !reduce) ref.current.textContent = format(latest, decimalPlaces);
      }),
    [springValue, decimalPlaces, reduce],
  );

  const shown = reduce ? (direction === "down" ? startValue : value) : direction === "down" ? value : startValue;

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {format(shown, decimalPlaces)}
    </span>
  );
}
