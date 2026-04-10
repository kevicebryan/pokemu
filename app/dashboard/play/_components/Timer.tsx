"use client";

import { Group, Progress, Text } from "@mantine/core";
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
        <Group gap="sm" align="center" style={{ width: "100%" }}>
            <Text size="xl" fw={800} c={color} style={{ minWidth: 48, textAlign: "right" }}>{seconds}s</Text>
            <Progress value={pct} color={color} size="lg" radius="xl" style={{ flex: 1 }} />
        </Group>
    );
}
