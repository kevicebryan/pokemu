"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, Box, Overlay, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearAuthUser } from "@/redux/slices/authSlice";
import { clearProfile } from "@/redux/slices/profileSlice";
import { MAX_HEARTS } from "@/util/constant";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardNavbar } from "./DashboardNavbar";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const theme = useMantineTheme();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);
  const profile = useAppSelector((state) => state.profile.profile);
  const [mobileNavOpened, { toggle: toggleMobileNav, close: closeMobileNav }] =
    useDisclosure(false);
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);

  const heartsLeft = Math.min(
    MAX_HEARTS,
    Math.max(0, profile?.hearts ?? MAX_HEARTS),
  );

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace("/login");
    }
  }, [initialized, isAuthenticated, router]);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    if (isDesktop) {
      closeMobileNav();
    }
  }, [isDesktop, closeMobileNav]);

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
      header={{ height: 64 }}
      navbar={{
        width: 200,
        breakpoint: "sm",
        collapsed: { mobile: !mobileNavOpened },
      }}
      styles={{ main: { background: "var(--pokemu-bg)" } }}
    >
      <DashboardHeader
        heartsLeft={heartsLeft}
        mobileNavOpened={mobileNavOpened}
        onToggleMobileNav={toggleMobileNav}
      />
      <DashboardNavbar pathname={pathname} onLogout={handleLogout} />

      {mobileNavOpened ? (
        <Overlay
          hiddenFrom="sm"
          fixed
          zIndex="var(--mantine-z-index-app)"
          backgroundOpacity={0.35}
          onClick={closeMobileNav}
        />
      ) : null}

      <AppShell.Main>
        <Box p="md">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
