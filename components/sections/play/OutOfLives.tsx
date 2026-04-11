"use client";

import { Box, Button, Text, Title } from "@mantine/core";

interface OutOfLivesProps {
  checkBackIn: string | null;
  onBuyHearts: () => void;
  buyHeartsLoading: boolean;
}

export default function OutOfLives({ checkBackIn, onBuyHearts, buyHeartsLoading }: OutOfLivesProps) {
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
      <Button onClick={onBuyHearts} loading={buyHeartsLoading}>
        Buy full lives (card)
      </Button>
      <Text size="xs" c="dimmed" ta="center" maw={320}>
        Opens Stripe Checkout. You can also tap the hearts in the header when you&apos;re at 0 lives.
      </Text>
    </Box>
  );
}
