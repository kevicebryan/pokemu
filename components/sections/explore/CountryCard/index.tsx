import { Button, Card, Group, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

export type CountryCardData = {
  countryCode: string;
  countryName: string;
  unlockedCount: number;
  totalCount: number;
};

type CountryCardProps = {
  item: CountryCardData;
  onPlay: (countryCode: string) => void;
  onViewCollection: (countryCode: string) => void;
};

function countryCodeToFlagUrl(code?: string): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return `https://flagcdn.com/w80/${normalized.toLowerCase()}.png`;
}

const CountryCard = ({ item, onPlay, onViewCollection }: CountryCardProps) => {
  const remainingCount = Math.max(0, item.totalCount - item.unlockedCount);
  const progress = item.totalCount > 0 ? (item.unlockedCount / item.totalCount) * 100 : 0;
  const flagUrl = countryCodeToFlagUrl(item.countryCode);

  return (
    <Card withBorder radius="md" padding="md" h="100%">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap">
            {flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flagUrl}
                alt={`${item.countryName} flag`}
                width={28}
                height={20}
                style={{ borderRadius: 4, objectFit: "cover", border: "1px solid var(--mantine-color-gray-3)" }}
              />
            ) : (
              <ThemeIcon variant="light" color="gray" radius="sm" size="md">
                <IconMapPin size={14} />
              </ThemeIcon>
            )}
            <Stack gap={0}>
              <Text fw={600} lineClamp={1}>
                {item.countryName}
              </Text>
              <Text size="xs" c="dimmed">
                {item.countryCode}
              </Text>
            </Stack>
          </Group>
        </Group>

        <Progress value={progress} radius="xl" color="teal" />

        <Group justify="space-between" c="dimmed">
          <Text size="sm">Unlocked: {item.unlockedCount}</Text>
          <Text size="sm">Remaining: {remainingCount}</Text>
        </Group>

        <Group grow>
          <Button variant="outline" onClick={() => onPlay(item.countryCode)}>
            Play
          </Button>
          <Button onClick={() => onViewCollection(item.countryCode)}>
            View
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};

export default CountryCard;