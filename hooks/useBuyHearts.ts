"use client";

import { useCallback, useState } from "react";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/lib/supabase/client";

export function useBuyHearts() {
  const [loading, setLoading] = useState(false);

  const startCheckout = useCallback(async () => {
    if (!supabase) {
      notifications.show({
        color: "red",
        title: "Not configured",
        message: "Supabase client is missing.",
      });
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      notifications.show({
        color: "red",
        title: "Sign in required",
        message: "Log in again to purchase lives.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/hearts", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      let json: { url?: string; error?: string };
      try {
        json = (await res.json()) as { url?: string; error?: string };
      } catch {
        notifications.show({
          color: "red",
          title: "Checkout failed",
          message: `Server returned ${res.status}. Check the terminal / Network tab.`,
        });
        return;
      }
      if (!res.ok) {
        notifications.show({
          color: "red",
          title: "Checkout unavailable",
          message: json.error ?? "Add Stripe keys in .env.local or try again later.",
        });
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      notifications.show({
        color: "red",
        title: "Checkout failed",
        message: "No redirect URL from Stripe. Check STRIPE_SECRET_KEY and STRIPE_PRICE_ID_HEART_REFILL (no spaces after =).",
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Network error",
        message: err instanceof Error ? err.message : "Could not reach /api/checkout/hearts.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return { startCheckout, loading };
}
