import { Card, Stack, Text, Title } from "@mantine/core";

export default function DashboardPlayPage() {
  return (
    <Card maw={720}>
      <Stack>
        <Title order={2}>Play</Title>
        <Text c="dimmed">Your gameplay scene will live here next.</Text>
      </Stack>
    </Card>
  );
}
