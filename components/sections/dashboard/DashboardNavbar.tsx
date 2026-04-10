"use client";

import Link from "next/link";
import {
  AppShell,
  Box,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import type { IconProps } from "@tabler/icons-react";
import {
  IconBook,
  IconCompass,
  IconDeviceGamepad,
  IconDoor,
  IconLogout2,
  IconMoonStars,
  IconSun,
  IconUser,
} from "@tabler/icons-react";
import styles from "./DashboardNavbar.module.css";
type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/play", label: "Play", Icon: IconDeviceGamepad },
  { href: "/dashboard/explore", label: "Explore", Icon: IconCompass },
  { href: "/dashboard/profile", label: "Profile", Icon: IconUser },
  { href: "/dashboard/collection", label: "Collection", Icon: IconBook },
  { href: "/dashboard/room", label: "Room", Icon: IconDoor },
];

type DashboardNavbarProps = {
  pathname: string;
  onLogout: () => void;
};

export function DashboardNavbar({ pathname, onLogout }: DashboardNavbarProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <AppShell.Navbar p="0" >
      <Stack justify="space-between" h="100%">
        <Stack gap="0">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <NavLink
              key={href}
              component={Link}
              href={href}
              label={label}
              active={
                href === "/dashboard/room"
                  ? pathname === href || pathname.startsWith(`${href}/`)
                  : pathname === href
              }
              leftSection={<Icon size={20} />}
              py={"sm"}
            />
          ))}
        </Stack>

        <Stack gap="xs" p="sm" className={styles.footerControls}>
          <Group gap={"xs"}>
            <UnstyledButton
              className={styles.themeToggle}
              type="button"
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
            >

              <Box className={styles.toggleTrack} data-dark={isDark || undefined}>
                <Box className={styles.toggleKnob} data-dark={isDark || undefined}>
                  <Box className={styles.toggleKnobInner} data-dark={isDark || undefined}>
                    <IconSun size={12} className={`${styles.knobIcon} ${styles.knobSun}`} />
                    <IconMoonStars size={12} className={`${styles.knobIcon} ${styles.knobMoon}`} />
                  </Box>
                </Box>
              </Box>
            </UnstyledButton>
            <Text size="xs" fw={700} className={styles.toggleLabel}>
              {isDark ? "Dark mode" : "Light mode"}
            </Text>
          </Group>
          <Button
            variant="transparent"
            w="fit-content"
            className={styles.logoutButton}
            onClick={onLogout}
            leftSection={<IconLogout2 size={16} />}
          >
            Logout
          </Button>
        </Stack>
      </Stack>
    </AppShell.Navbar >
  );
}
