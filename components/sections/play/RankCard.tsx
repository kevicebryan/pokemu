"use client";

import { supabase } from "@/lib/supabase/client";
import { useAppSelector } from "@/redux/hooks";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
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
        background: "var(--mantine-color-default)",
        border: "3px solid var(--mantine-color-mistral-6)",
        boxShadow: "6px 6px 0 rgba(0,0,0,0.45)",
      }}
    >
      <Text
        fw={900}
        mb="sm"
        style={{
          fontFamily: '"Handjet", "Courier New", monospace',
          fontSize: 20,
          letterSpacing: 1,
          color: "var(--mantine-color-mistral-3)",
          textTransform: "uppercase",
        }}
      >
        Speedrun Leaderboard
      </Text>

      {loading ? (
        <Group justify="center" py="sm">
          <Loader size="sm" color="mistral" />
        </Group>
      ) : top5.length === 0 ? (
        <Text size="sm" c="dimmed" ff="monospace">
          No records yet.
        </Text>
      ) : (
        <Stack gap={4}>
          {top5.map((entry) => {
            const isCurrentUser = entry.user_id === userId;
            const i = entry.rank - 1;
            return (
              <Group
                key={entry.user_id}
                justify="space-between"
                px={8}
                py={5}
                style={
                  isCurrentUser
                    ? {
                        background: "var(--mantine-color-mistral-6)",
                        border: "2px solid var(--mantine-color-mistral-9)",
                        boxShadow: "3px 3px 0 rgba(0,0,0,0.4)",
                      }
                    : {
                        borderBottom: "1px solid var(--mantine-color-dark-5)",
                      }
                }
              >
                <Group gap={10}>
                  <Text
                    size="sm"
                    ff="monospace"
                    fw={700}
                    w={28}
                    ta="center"
                    c={isCurrentUser ? "var(--mantine-color-mistral-1)" : "var(--mantine-color-mistral-4)"}
                  >
                    {i < 3 ? MEDALS[i] : `#${entry.rank}`}
                  </Text>
                  <Text
                    size="sm"
                    ff="monospace"
                    fw={isCurrentUser ? 700 : 400}
                    c={isCurrentUser ? "var(--mantine-color-mistral-1)" : undefined}
                  >
                    {entry.username}
                  </Text>
                </Group>
                <Text
                  size="sm"
                  ff="monospace"
                  c={isCurrentUser ? "var(--mantine-color-mistral-2)" : "dimmed"}
                >
                  {formatTime(entry.avg_time)}
                </Text>
              </Group>
            );
          })}
        </Stack>
      )}

      {currentRank !== null && currentRank > 5 && (
        <Text size="xs" ff="monospace" c="var(--mantine-color-mistral-4)" mt="xs">
          Your rank: #{currentRank}
        </Text>
      )}

      <Text size="xs" ff="monospace" c="dimmed" mt="sm" style={{ opacity: 0.5 }}>
        avg. time per artifact
      </Text>
    </Box>
  );
}
