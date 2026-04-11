"use client";

import { supabase } from "@/lib/supabase/client";
import { useAppSelector } from "@/redux/hooks";
import { Box, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";

type RankEntry = {
  rank: number;
  user_id: string;
  username: string;
  avg_time: number;
  artifact_count: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function RankCard() {
  const userId = useAppSelector((s) => s.auth.user?.id);
  const [top5, setTop5] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      if (!supabase) return;
      const { data } = await supabase.rpc("get_speedrun_leaderboard");
      setTop5((data as RankEntry[]) ?? []);
      setLoading(false);
    }
    void fetchRankings();
  }, []);

  const currentRank = userId
    ? (top5.find((e) => e.user_id === userId)?.rank ?? null)
    : null;

  return (
    <Box
      p="md"
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        minWidth: 260,
      }}
    >
      <Title order={5} mb="sm">
        Speedrun Leaderboard
      </Title>

      {loading ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : top5.length === 0 ? (
        <Text size="sm" c="dimmed">
          No records yet.
        </Text>
      ) : (
        <Stack gap={6}>
          {top5.map((entry) => {
            const isCurrentUser = entry.user_id === userId;
            const i = entry.rank - 1;
            return (
              <Group
                key={entry.user_id}
                justify="space-between"
                px={8}
                py={4}
                style={{
                  borderRadius: "var(--mantine-radius-sm)",
                  background: isCurrentUser
                    ? "var(--mantine-color-blue-light)"
                    : undefined,
                }}
              >
                <Group gap={8}>
                  <Text size="sm" w={24} ta="center">
                    {i < 3 ? MEDALS[i] : `${entry.rank}.`}
                  </Text>
                  <Text size="sm" fw={isCurrentUser ? 700 : 400}>
                    {entry.username}
                  </Text>
                </Group>
                <Text size="sm" ff="monospace" c="dimmed">
                  {formatTime(entry.avg_time)}
                </Text>
              </Group>
            );
          })}
        </Stack>
      )}

      {currentRank !== null && currentRank > 5 && (
        <Text size="xs" c="dimmed" mt="xs">
          Your rank: #{currentRank}
        </Text>
      )}

      <Text size="xs" c="dimmed" mt="sm">
        Ranked by avg. time per artifact
      </Text>
    </Box>
  );
}
