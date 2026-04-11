"use client";

import { Box, Button, Text, Title } from "@mantine/core";

interface OutOfLivesProps {
  checkBackIn: string | null;
  /** Opens the out-of-hearts modal (video reward + Stripe). */
  onGetLivesBack: () => void;
}

export default function OutOfLives({ checkBackIn, onGetLivesBack }: OutOfLivesProps) {
  return (
    <Box
      style={{
        height: "calc(100dvh - 64px - 32px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <Text size="64px" style={{ lineHeight: 1 }}>
        💀
      </Text>
      <Title order={2}>Out of Lives</Title>
      <Text c="dimmed" ta="center">
        Check back again in <b style={{ color: "white" }}>{checkBackIn ?? "..."}</b>.
      </Text>
      <Button onClick={onGetLivesBack}>Get lives back</Button>
      <Text size="xs" c="dimmed" ta="center" maw={320}>
        Watch a short video for 1 life (once per 24h) or buy a full refill with Stripe. You can also
        tap the hearts in the header.
      </Text>
    </Box>
  );
}
