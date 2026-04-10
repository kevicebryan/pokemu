"use client";

import { Group, Text } from "@mantine/core";

type Props = {
    correct: number;
    wrong: number;
    score: number;
};

export default function ScoreBoard({ correct, wrong, score }: Props) {
    return (
        <Group gap="xl">
            <Text size="sm" c="green" fw={600}>✓ {correct}</Text>
            <Text size="sm" c="red" fw={600}>✗ {wrong}</Text>
            <Text size="sm" fw={700}>{score} pts</Text>
        </Group>
    );
}
