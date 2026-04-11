"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, Box, Overlay, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useBuyHearts } from "@/hooks/useBuyHearts";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearAuthUser } from "@/redux/slices/authSlice";
import { clearProfile } from "@/redux/slices/profileSlice";
import { MAX_HEARTS } from "@/util/constant";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardNavbar } from "./DashboardNavbar";
import { OutOfHeartsModal } from "./OutOfHeartsModal";
import { OutOfHeartsModalProvider } from "./OutOfHeartsModalContext";
import { StripeCheckoutReturn } from "./StripeCheckoutReturn";

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

  const { startCheckout: buyHearts, loading: buyHeartsLoading } = useBuyHearts();
  const [outOfHeartsOpen, setOutOfHeartsOpen] = useState(false);
  const openOutOfHeartsModal = useCallback(() => setOutOfHeartsOpen(true), []);
  const lastHeartReset = profile?.last_heart_reset ?? null;

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
    <OutOfHeartsModalProvider open={openOutOfHeartsModal}>
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
        <Suspense fallback={null}>
          <StripeCheckoutReturn />
        </Suspense>
        <OutOfHeartsModal
          opened={outOfHeartsOpen}
          onClose={() => setOutOfHeartsOpen(false)}
          lastHeartReset={lastHeartReset}
          onBuyHearts={buyHearts}
          buyHeartsLoading={buyHeartsLoading}
        />
        <DashboardHeader
          heartsLeft={heartsLeft}
          mobileNavOpened={mobileNavOpened}
          onToggleMobileNav={toggleMobileNav}
          onOpenOutOfHearts={openOutOfHeartsModal}
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
    </OutOfHeartsModalProvider>
  );
}
