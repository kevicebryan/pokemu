"use client";

import { useEffect, useRef, useState } from "react";

interface Bubble {
    id: number;
    text: string;
    x: number;
}

interface Props {
    facts: string[];
}

const STAY_MS = 5000;
const EXIT_MS = 1000;

export default function FactBubbles({ facts }: Props) {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const seenCount = useRef(0);
    const idRef = useRef(0);

    useEffect(() => {
        if (facts.length <= seenCount.current) return;

        for (let i = seenCount.current; i < facts.length; i++) {
            const id = ++idRef.current;
            const x = 8 + Math.random() * 62; // keep within 8–70% so text doesn't clip

            setBubbles(prev => [...prev, { id, text: facts[i], x }]);

            setTimeout(() => {
                setBubbles(prev => prev.filter(b => b.id !== id));
            }, STAY_MS + EXIT_MS);
        }

        seenCount.current = facts.length;
    }, [facts]);

    return (
        <>
            <style>{`
                @keyframes fact-float {
                    0%   { opacity: 0; transform: translateX(-50%) translateY(0);     }
                    15%  { opacity: 1; }
                    80%  { opacity: 1; transform: translateX(-50%) translateY(-120px); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-160px); }
                }
            `}</style>
            {bubbles.map(b => (
                <div
                    key={b.id}
                    style={{
                        position: "absolute",
                        left: `${b.x}%`,
                        bottom: 0,
                        transform: "translateX(-50%)",
                        background: "rgba(20,20,20,0.82)",
                        backdropFilter: "blur(6px)",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "7px 18px",
                        fontSize: 13,
                        fontWeight: 500,
                        maxWidth: 260,
                        whiteSpace: "normal",
                        textAlign: "center",
                        pointerEvents: "none",
                        zIndex: 20,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                        animation: `fact-float ${STAY_MS + EXIT_MS}ms ease-in-out forwards`,
                    }}
                >
                    💡 {b.text}
                </div>
            ))}
        </>
    );
}
