"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useMemo, useRef, useState } from "react";

type BubblePosition = {
  top: string;
  left: string;
};

type Props = {
  facts: string[];
  visibleCount: number;
  /** Inclusive % range for random bubble anchor `top` (default ~8–70). */
  topPercentRange?: [number, number];
  /** Inclusive % range for random bubble anchor `left` (default ~8–88). */
  leftPercentRange?: [number, number];
};

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.sin(hash) * 10000;
  return normalized - Math.floor(normalized);
}

/**
 * Bubble anchor must avoid the central image: wide horizontal band so bubbles sit
 * in the left/right margins; slightly shorter vertical band for the picture area.
 */
const EDGE_PAD = 8;
const MAX_ATTEMPTS = 64;

/** Inclusive % ranges — “forbidden” rectangle for bubble center (both must match). */
const DEAD_LEFT_MIN = 24;
const DEAD_LEFT_MAX = 76;
const DEAD_TOP_MIN = 34;
const DEAD_TOP_MAX = 66;

function isInImageDeadZone(leftPct: number, topPct: number): boolean {
  const inH = leftPct >= DEAD_LEFT_MIN && leftPct <= DEAD_LEFT_MAX;
  const inV = topPct >= DEAD_TOP_MIN && topPct <= DEAD_TOP_MAX;
  return inH && inV;
}

function bubblePositionForFact(
  fact: string,
  index: number,
  ranges?: { top?: [number, number]; left?: [number, number] },
): BubblePosition {
  const leftMin = ranges?.left?.[0] ?? EDGE_PAD;
  const leftMax = ranges?.left?.[1] ?? 88;
  const topMin = ranges?.top?.[0] ?? EDGE_PAD;
  const topMax = ranges?.top?.[1] ?? 70;
  const leftSpan = Math.max(0.001, leftMax - leftMin);
  const topSpan = Math.max(0.001, topMax - topMin);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const left = leftMin + seededRandom(`${fact}-${index}-L${attempt}`) * leftSpan;
    const top = topMin + seededRandom(`${fact}-${index}-T${attempt}`) * topSpan;
    if (!isInImageDeadZone(left, top)) {
      return { top: `${top}%`, left: `${left}%` };
    }
  }
  const corner = index % 4;
  const fallbacks: BubblePosition[] = [
    { top: "14%", left: "14%" },
    { top: "14%", left: "86%" },
    { top: "78%", left: "14%" },
    { top: "78%", left: "86%" },
  ];
  return fallbacks[corner] ?? fallbacks[0];
}

function bubbleKey(index: number, fact: string): string {
  return `${index}::${fact}`;
}

export default function FactBubbles({
  facts,
  visibleCount,
  topPercentRange,
  leftPercentRange,
}: Props) {
  const nextVisibleCount = Math.max(0, Math.min(visibleCount, facts.length));

  const visibleFacts = useMemo(
    () => facts.slice(0, nextVisibleCount),
    [facts, nextVisibleCount],
  );

  const positionRanges = useMemo(
    () => ({ top: topPercentRange, left: leftPercentRange }),
    [topPercentRange, leftPercentRange],
  );

  const positions = useMemo<BubblePosition[]>(
    () =>
      visibleFacts.map((fact, index) =>
        bubblePositionForFact(fact, index, positionRanges),
      ),
    [visibleFacts, positionRanges],
  );

  const constraintsRef = useRef<HTMLDivElement>(null);

  /**
   * Pixel nudge from drag, controlled in React so it survives viewport resize.
   * (Framer Motion’s internal drag offset can reset when `dragConstraints` is re-measured.)
   */
  const [dragNudgeByKey, setDragNudgeByKey] = useState<
    Record<string, { x: number; y: number }>
  >({});

  return (
    <div
      ref={constraintsRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <AnimatePresence>
        {visibleFacts.map((fact, index) => {
          const position = positions[index] ?? { top: "50%", left: "50%" };
          const key = bubbleKey(index, fact);
          const nudge = dragNudgeByKey[key] ?? { x: 0, y: 0 };
          return (
            <motion.div
              key={`${index}-${fact}`}
              drag
              dragConstraints={constraintsRef}
              dragMomentum={false}
              dragElastic={0.06}
              transformTemplate={(_, generated) =>
                `translate(-50%, -50%) ${generated}`.trim()
              }
              onDragEnd={(_event, info: PanInfo) => {
                setDragNudgeByKey((prev) => {
                  const cur = prev[key] ?? { x: 0, y: 0 };
                  return {
                    ...prev,
                    [key]: {
                      x: cur.x + info.offset.x,
                      y: cur.y + info.offset.y,
                    },
                  };
                });
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileDrag={{ cursor: "grabbing", scale: 1.02, zIndex: 30 }}
              transition={{ type: "spring", stiffness: 340, damping: 24, mass: 0.75 }}
              title="Drag to move"
              style={{
                position: "absolute",
                left: position.left,
                top: position.top,
                x: nudge.x,
                y: nudge.y,
                cursor: "grab",
                touchAction: "none",
                pointerEvents: "auto",
                zIndex: 5,
                width: "max-content",
                maxWidth: 300,
                background: "var(--mantine-color-mistral-6)",
                color: "var(--mantine-color-mistral-1)",
                borderRadius: 0,
                border: "3px solid var(--mantine-color-mistral-9)",
                padding: "12px 18px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "monospace",
                letterSpacing: 0.4,
                lineHeight: 1.45,
                textAlign: "center",
                userSelect: "none",
                boxShadow: "0 0 0 3px rgba(0,0,0,0.45), 8px 8px 0 rgba(0,0,0,0.35)",
              }}
            >
              {fact}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
