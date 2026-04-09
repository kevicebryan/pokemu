import { Card, Stack, Text, Title } from "@mantine/core";

export default function DashboardCollectionPage() {
  return (
    <Card maw={720}>
      <Stack>
        <Title order={2}>Collection</Title>
        <Text c="dimmed">Your restored artifacts and entries will show here.</Text>
      </Stack>
    </Card>
  );
}
