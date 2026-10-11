"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// reducedMotion="user": when the OS asks for reduced motion, motion skips transform and layout
// animations everywhere (opacity fades stay). Components with looping animations also check
// useReducedMotion() themselves and render a static state.
export default function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
