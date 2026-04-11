"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ActionIcon, Anchor, AppShell, Burger, Group, Image, Text, UnstyledButton } from "@mantine/core";
import { IconHeart, IconHeartFilled, IconMusic, IconMusicOff, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { HOME_BGM_SRC, LOGO_IMAGE_URL, MAX_HEARTS } from "@/util/constant";

function startDashboardBackgroundMusic(el: HTMLAudioElement) {
  el.loop = true;
  if (!el.paused) return;
  el.muted = true;
  void el
    .play()
    .then(() => {
      el.muted = false;
    })
    .catch(() => {
      el.muted = false;
      void el.play().catch(() => { });
    });
}

type DashboardHeaderProps = {
  heartsLeft: number;
  mobileNavOpened: boolean;
  onToggleMobileNav: () => void;
  onBuyHearts?: () => void;
  buyHeartsLoading?: boolean;
};

export function DashboardHeader({
  heartsLeft,
  mobileNavOpened,
  onToggleMobileNav,
  onBuyHearts,
  buyHeartsLoading = false,
}: DashboardHeaderProps) {
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const dashboardMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isMusicEnabled) {
      dashboardMusicRef.current?.pause();
      return;
    }
    const el = dashboardMusicRef.current;
    if (el) startDashboardBackgroundMusic(el);
  }, [isMusicEnabled]);

  useEffect(() => {
    const el = dashboardMusicRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  const toggleMusic = () => {
    const el = dashboardMusicRef.current;
    const nextEnabled = !isMusicEnabled;
    setIsMusicEnabled(nextEnabled);
    if (!el) return;
    if (nextEnabled) {
      startDashboardBackgroundMusic(el);
      return;
    }
    el.pause();
  };

  return (
    <AppShell.Header px="md" py="xs" withBorder>
      <audio ref={dashboardMusicRef} src={HOME_BGM_SRC} preload="auto" loop hidden />
      <Group justify="space-between" align="center" h="100%" wrap="nowrap">
        <Group gap="sm" align="center" wrap="nowrap">
          <Burger
            hiddenFrom="sm"
            opened={mobileNavOpened}
            onClick={onToggleMobileNav}
            size="sm"
            aria-label="Open navigation menu"
          />
          <Anchor component={Link} href="/dashboard/profile" display="block" lh={0}>
            <Image
              src={LOGO_IMAGE_URL}
              alt="Pokemu"
              h={40}
              w="auto"
              fit="contain"
              style={{ objectPosition: "left" }}
            />
          </Anchor>
          <ActionIcon
            variant="outline"
            color="dark"
            size="lg"
            radius={0}
            aria-label={isMusicEnabled ? "Turn music off" : "Turn music on"}
            onClick={toggleMusic}
          >
            {isMusicEnabled ? (
              <IconMusic size={20} stroke={1.5} />
            ) : (
              <IconMusicOff size={20} stroke={1.5} />
            )}
          </ActionIcon>
        </Group>

        <Group justify="flex-end" align="center" gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed" visibleFrom="xs">
            {heartsLeft}/{MAX_HEARTS}
          </Text>
          {heartsLeft === 0 && onBuyHearts ? (
            <UnstyledButton
              type="button"
              onClick={() => onBuyHearts()}
              disabled={buyHeartsLoading}
              title="Buy full lives (secure card checkout)"
              aria-label="Buy full lives"
              style={{ cursor: buyHeartsLoading ? "wait" : "pointer" }}
            >
              <Group gap={4} wrap="nowrap">
                {Array.from({ length: MAX_HEARTS }, (_, index) => (
                  <IconHeart
                    key={index}
                    size={22}
                    color="var(--mantine-color-dimmed)"
                    stroke={1.5}
                  />
                ))}
              </Group>
            </UnstyledButton>
          ) : (
            <Group gap={4} wrap="nowrap">
              {Array.from({ length: MAX_HEARTS }, (_, index) => {
                const filled = index < heartsLeft;
                return filled ? (
                  <IconHeartFilled
                    key={index}
                    size={22}
                    color="var(--mantine-color-mistral-6)"
                    stroke={1.5}
                  />
                ) : (
                  <IconHeart
                    key={index}
                    size={22}
                    color="var(--mantine-color-dimmed)"
                    stroke={1.5}
                  />
                );
              })}
            </Group>
          )}
        </Group>
      </Group>
    </AppShell.Header>
  );
}
