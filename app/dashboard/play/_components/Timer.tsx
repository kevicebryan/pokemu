"use client";

import { RingProgress, Text } from "@mantine/core";
import { useEffect, useState } from "react";

const TOTAL = 60;

type Props = {
    onExpire: () => void;
    onTick?: (secondsLeft: number) => void;
    stopped?: boolean;
};

export default function Timer({ onExpire, onTick, stopped = false }: Props) {
    const [seconds, setSeconds] = useState(TOTAL);

    useEffect(() => {
        if (stopped) return;
        if (seconds === 0) { onExpire(); return; }
        onTick?.(seconds);
        const id = setTimeout(() => setSeconds(s => s - 1), 1000);
        return () => clearTimeout(id);
    }, [seconds, onExpire, onTick, stopped]);

    const pct = (seconds / TOTAL) * 100;
    const color = seconds > 30 ? "green" : seconds > 10 ? "orange" : "red";

    return (
        <RingProgress
            size={64}
            thickness={6}
            roundCaps
            sections={[{ value: pct, color }]}
            label={
                <Text ta="center" size="xs" fw={700} c={color}>
                    {seconds}s
                </Text>
            }
        />
    );
}
