"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

type BubblePosition = {
  top: string;
  left: string;
};

type Props = {
  facts: string[];
  visibleCount: number;
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

export default function FactBubbles({ facts, visibleCount }: Props) {
  const nextVisibleCount = Math.max(0, Math.min(visibleCount, facts.length));

  const visibleFacts = useMemo(
    () => facts.slice(0, nextVisibleCount),
    [facts, nextVisibleCount],
  );

  const positions = useMemo<BubblePosition[]>(
    () =>
      visibleFacts.map((fact, index) => ({
        top: `${8 + seededRandom(`${fact}-${index}-top`) * (70 - 8)}%`,
        left: `${8 + seededRandom(`${fact}-${index}-left`) * (88 - 8)}%`,
      })),
    [visibleFacts],
  );

  return (
    <>
      <AnimatePresence>
        {visibleFacts.map((fact, index) => {
          const position = positions[index] ?? { top: "50%", left: "50%" };
          return (
            <motion.div
              key={`${index}-${fact}`}
              initial={{ opacity: 0, scale: 0.86, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ type: "spring", stiffness: 340, damping: 22, mass: 0.7 }}
              style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                transform: "translate(-50%, -50%)",
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
                maxWidth: 300,
                textAlign: "center",
                zIndex: 4,
                pointerEvents: "none",
                boxShadow: "0 0 0 3px rgba(0,0,0,0.45), 8px 8px 0 rgba(0,0,0,0.35)",
              }}
            >
              {fact}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </>
  );
}
