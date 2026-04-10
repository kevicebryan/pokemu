"use client";

import Link from "next/link";
import { AppShell, Button, NavLink, Stack } from "@mantine/core";
import type { IconProps } from "@tabler/icons-react";
import { IconBook, IconDeviceGamepad, IconDoor, IconLogout2, IconUser } from "@tabler/icons-react";
type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/play", label: "Play", Icon: IconDeviceGamepad },
  { href: "/dashboard/profile", label: "Profile", Icon: IconUser },
  { href: "/dashboard/collection", label: "Collection", Icon: IconBook },
  { href: "/dashboard/room", label: "Room", Icon: IconDoor },
];

type DashboardNavbarProps = {
  pathname: string;
  onLogout: () => void;
};

export function DashboardNavbar({ pathname, onLogout }: DashboardNavbarProps) {
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

        <Button
          variant="transparent"
          w="fit-content"
          onClick={onLogout}
          leftSection={<IconLogout2 size={16} />}
        >
          Logout
        </Button>
      </Stack>
    </AppShell.Navbar>
  );
}
