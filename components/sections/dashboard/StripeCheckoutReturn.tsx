"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProfileByUserId } from "@/redux/slices/profileSlice";

export function StripeCheckoutReturn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const processedKey = useRef<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout !== "success" || !sessionId || !userId) {
      return;
    }
    const key = `${sessionId}:${userId}`;
    if (processedKey.current === key) {
      return;
    }
    processedKey.current = key;

    (async () => {
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        processedKey.current = null;
        return;
      }
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        notifications.show({
          color: "red",
          title: "Could not apply purchase",
          message: json.error ?? "Unknown error.",
        });
      } else {
        await dispatch(fetchProfileByUserId(userId));
        notifications.show({
          color: "teal",
          title: "Lives restored",
          message: "Thanks — your hearts are refilled.",
        });
      }
      router.replace("/dashboard/play");
    })();
  }, [dispatch, router, searchParams, userId]);

  return null;
}
