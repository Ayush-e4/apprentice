// Animated Beam, from Magic UI: https://magicui.design/docs/components/animated-beam
// Copied from the registry (https://magicui.design/r/animated-beam.json). MIT License, (c) Magic UI.
// Adapted for Apprentice: a separate width for the base rule and the moving beam, square line caps,
// a single-colour beam (no rainbow gradient), and a static rule when the user prefers reduced motion.
"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  beamWidth?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  delay?: number;
  duration?: number;
  repeat?: number;
  repeatDelay?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 5,
  delay = 0,
  pathColor = "#0A0A0A",
  pathWidth = 1,
  pathOpacity = 1,
  beamWidth = 3,
  gradientStartColor = "#1F4BFF",
  gradientStopColor = "#1F4BFF",
  repeat = Infinity,
  repeatDelay = 0,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) => {
  const id = useId();
  const reduce = useReducedMotion();
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // The beam is a short bright segment that travels from the start point to the end point.
  // Its gradient is laid out in user space along the path, so straight horizontal and vertical
  // paths both work (the registry version swept the whole SVG width).
  const [ends, setEnds] = useState({ sx: 0, sy: 0, ex: 0, ey: 0 });
  const { sx, sy, ex, ey } = reverse ? { sx: ends.ex, sy: ends.ey, ex: ends.sx, ey: ends.sy } : ends;
  const len = Math.hypot(ex - sx, ey - sy) || 1;
  const beam = Math.max(36, len * 0.4);
  const dx = ((ex - sx) / len) * beam;
  const dy = ((ey - sy) / len) * beam;
  const animate = { x1: [sx, ex + dx], y1: [sy, ey + dy], x2: [sx - dx, ex], y2: [sy - dy, ey] };

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const rectA = fromRef.current.getBoundingClientRect();
        const rectB = toRef.current.getBoundingClientRect();

        setSvgDimensions({ width: containerRect.width, height: containerRect.height });

        const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
        const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
        const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
        const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

        setEnds({ sx: startX, sy: startY, ex: endX, ey: endY });
        const controlY = startY - curvature;
        setPathD(`M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`);
      }
    };

    const resizeObserver = new ResizeObserver(() => updatePath());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    updatePath();
    return () => resizeObserver.disconnect();
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  return (
    <svg
      aria-hidden
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute top-0 left-0 transform-gpu", className)}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <path d={pathD} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="square" />
      {!reduce && (
        <>
          <path d={pathD} strokeWidth={beamWidth} stroke={`url(#${id})`} strokeOpacity="1" strokeLinecap="butt" />
          <defs>
            <motion.linearGradient
              className="transform-gpu"
              id={id}
              gradientUnits="userSpaceOnUse"
              initial={{ x1: sx, x2: sx - dx, y1: sy, y2: sy - dy }}
              animate={animate}
              transition={{ delay, duration, ease: [0.45, 0, 0.55, 1], repeat, repeatDelay }}
            >
              <stop stopColor={gradientStartColor} stopOpacity="0" />
              <stop stopColor={gradientStartColor} />
              <stop offset="35%" stopColor={gradientStopColor} />
              <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </>
      )}
    </svg>
  );
};
