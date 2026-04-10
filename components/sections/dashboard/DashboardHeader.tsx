"use client";

import Link from "next/link";
import { Anchor, AppShell, Burger, Group, Image, Text } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { LOGO_IMAGE_URL, MAX_HEARTS } from "@/util/constant";

type DashboardHeaderProps = {
  heartsLeft: number;
  mobileNavOpened: boolean;
  onToggleMobileNav: () => void;
};

export function DashboardHeader({
  heartsLeft,
  mobileNavOpened,
  onToggleMobileNav,
}: DashboardHeaderProps) {
  return (
    <AppShell.Header px="md" py="xs" withBorder>
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
        </Group>

        <Group justify="flex-end" align="center" gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed" visibleFrom="xs">
            {heartsLeft}/{MAX_HEARTS}
          </Text>
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
        </Group>
      </Group>
    </AppShell.Header>
  );
}
