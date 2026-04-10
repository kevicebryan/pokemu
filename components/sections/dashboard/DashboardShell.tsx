"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, Box } from "@mantine/core";
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
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);
  const profile = useAppSelector((state) => state.profile.profile);

  const heartsLeft = Math.min(
    MAX_HEARTS,
    Math.max(0, profile?.hearts ?? MAX_HEARTS),
  );

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
      header={{ height: 64 }}
      navbar={{ width: 200, breakpoint: "sm" }}
      styles={{ main: { background: "var(--pokemu-bg)" } }}
    >
      <DashboardHeader heartsLeft={heartsLeft} />
      <DashboardNavbar pathname={pathname} onLogout={handleLogout} />

      <AppShell.Main>
        <Box p="md">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
