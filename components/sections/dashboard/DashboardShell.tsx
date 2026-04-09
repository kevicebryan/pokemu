"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, Box, Button, Image, NavLink, Stack } from "@mantine/core";
import { IconBook, IconGoGame, IconLogout2, IconUser } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearAuthUser } from "@/redux/slices/authSlice";
import { clearProfile } from "@/redux/slices/profileSlice";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace("/login");
    }
  }, [initialized, isAuthenticated, router]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    dispatch(clearAuthUser());
    dispatch(clearProfile());
    router.replace("/login");
  };

  if (!initialized || !isAuthenticated) {
    return null;
  }

  return (
    <AppShell
      padding="md"
      navbar={{ width: 260, breakpoint: "sm" }}
      styles={{ main: { background: "var(--pokemu-bg)" } }}
    >
      <AppShell.Navbar p="sm">
        <Stack justify="space-between" h="100%">
          <Stack gap="xs">
            <Image
              src="/pokemu.png"
              alt="Pokemu Logo"
              style={{
                height: "80px",
                width: "auto",
                objectFit: "contain",
                objectPosition: "left",
              }}
            />

            <NavLink
              component={Link}
              href="/dashboard/profile"
              label="Profile"
              active={pathname === "/dashboard/profile"}
              leftSection={<IconUser size={16} />}
            />
            <NavLink
              component={Link}
              href="/dashboard/play"
              label="Play"
              active={pathname === "/dashboard/play"}
              leftSection={<IconGoGame size={16} />}
            />
            <NavLink
              component={Link}
              href="/dashboard/collection"
              label="Collection"
              active={pathname === "/dashboard/collection"}
              leftSection={<IconBook size={16} />}
            />
          </Stack>

          <Button
            variant="transparent"
            w={"fit-content"}
            onClick={handleLogout}
            leftSection={<IconLogout2 size={16} />}>
            Logout
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="md">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
