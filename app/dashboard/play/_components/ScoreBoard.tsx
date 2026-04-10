"use client";

import { Box, Group, Stack, Text } from "@mantine/core";

type Props = {
    correct: number;
    wrong: number;
    score: number;
};

export default function ScoreBoard({ correct, wrong, score }: Props) {
    return (
        <Stack gap="xs" align="center" style={{ width: "100%" }}>
            <Text size="40px" fw={900} style={{ lineHeight: 1 }}>{score} pts</Text>
            <Group gap={0} style={{ width: "100%" }}>
                <Box style={{ flex: 1, textAlign: "center" }}>
                    <Text size="xl" c="green" fw={700}>✓ {correct}</Text>
                </Box>
                <Box style={{ flex: 1, textAlign: "center" }}>
                    <Text size="xl" c="red" fw={700}>✗ {wrong}</Text>
                </Box>
            </Group>
        </Stack>
    );
}
