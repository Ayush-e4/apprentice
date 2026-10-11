"use client";

// Entrance for chat messages: a short fade and rise. Under reduced motion, MotionConfig drops the
// movement and only the fade remains.

import { motion } from "motion/react";
import type { ReactNode } from "react";

export default function Appear({
  children,
  className,
  from = "below",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  from?: "below" | "right";
  delay?: number;
}) {
  return (
    <motion.div
      initial={from === "right" ? { opacity: 0, x: 12 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.2, 0, 0, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
