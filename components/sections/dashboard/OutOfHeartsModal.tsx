"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Modal, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProfileByUserId } from "@/redux/slices/profileSlice";
import { MAX_HEARTS, REWARD_VIDEO_SRC, VIDEO_HEART_COOLDOWN_MS } from "@/util/constant";
import { heartRefillCaption } from "@/util/heartCaption";
import {
  getLastVideoClaimMs,
  isVideoHeartOnCooldown,
  setVideoHeartClaimedAt,
} from "@/util/videoHeartStorage";

type OutOfHeartsModalProps = {
  opened: boolean;
  onClose: () => void;
  lastHeartReset: string | null;
  onBuyHearts: () => void;
  buyHeartsLoading: boolean;
};

function formatCooldownEndsFromMs(lastMs: number): string {
  const end = lastMs + VIDEO_HEART_COOLDOWN_MS;
  const delta = end - Date.now();
  if (delta <= 0) return "soon";
  const hours = Math.floor(delta / (60 * 60 * 1000));
  const mins = Math.ceil((delta % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.ceil(delta / (24 * 60 * 60 * 1000));
    return `in about ${days} day${days === 1 ? "" : "s"}`;
  }
  if (hours >= 1) {
    return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `in about ${mins} minute${mins === 1 ? "" : "s"}`;
}

export function OutOfHeartsModal({
  opened,
  onClose,
  lastHeartReset,
  onBuyHearts,
  buyHeartsLoading,
}: OutOfHeartsModalProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);

  const [videoRevealed, setVideoRevealed] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoMountKey, setVideoMountKey] = useState(0);
  const [claimLoading, setClaimLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownEndsHint, setCooldownEndsHint] = useState<string | null>(null);

  const refreshCooldown = useCallback(() => {
    const onCd = isVideoHeartOnCooldown();
    setCooldown(onCd);
    if (!onCd) {
      setCooldownEndsHint(null);
      return;
    }
    const lastMs = getLastVideoClaimMs();
    if (lastMs > 0) {
      setCooldownEndsHint(formatCooldownEndsFromMs(lastMs));
    }
  }, []);

  useEffect(() => {
    if (!opened) return;
    setVideoRevealed(false);
    setVideoEnded(false);
    setVideoMountKey((k) => k + 1);
    refreshCooldown();
  }, [opened, refreshCooldown]);

  function handleStartVideo() {
    setVideoRevealed(true);
    setVideoEnded(false);
    setVideoMountKey((k) => k + 1);
  }

  useEffect(() => {
    refreshCooldown();
  }, [refreshCooldown]);

  async function claimVideoHeart() {
    if (isVideoHeartOnCooldown()) {
      notifications.show({
        color: "yellow",
        title: "Cooldown",
        message: "You can only claim this reward once every 24 hours on this device.",
      });
      refreshCooldown();
      return;
    }
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      notifications.show({
        color: "red",
        title: "Sign in required",
        message: "Log in again to claim your reward.",
      });
      return;
    }
    setClaimLoading(true);
    try {
      const res = await fetch("/api/profile/video-heart", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = (await res.json()) as {
        hearts?: number;
        error?: string;
      };
      if (!res.ok) {
        notifications.show({
          color: "red",
          title: "Could not add a heart",
          message: json.error ?? `Request failed (${res.status}).`,
        });
        refreshCooldown();
        return;
      }
      // Cooldown is tracked only in localStorage: time of successful claim.
      setVideoHeartClaimedAt(new Date().toISOString());
      if (userId) {
        await dispatch(fetchProfileByUserId(userId));
      }
      notifications.show({
        color: "teal",
        title: "Heart restored",
        message: "You earned 1 life. Have fun scavenging!",
      });
      refreshCooldown();
      onClose();
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Network error",
        message: err instanceof Error ? err.message : "Request failed.",
      });
    } finally {
      setClaimLoading(false);
    }
  }

  const refillLine = heartRefillCaption(0, lastHeartReset);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Out of lives"
      size="md"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          You&apos;re out of hearts for now. {refillLine}
        </Text>

        <Stack gap={6}>
          <Title order={5}>Watch a short video</Title>
          <Text size="sm" c="dimmed">
            Finish the clip to get <b>1 heart</b> back. On this device you can claim at most once
            every 24 hours (tracked locally).
          </Text>
          {cooldown ? (
            <>
              <Text size="xs" c="dimmed">
                You already claimed the video reward within the last 24 hours on this browser.
              </Text>
              <Button disabled>
                Next free video reward {cooldownEndsHint ?? "in 24h"}
              </Button>
            </>
          ) : !videoRevealed ? (
            <>
              <Text size="xs" c="dimmed">
                Tap below to load the player — nothing plays until you press play on the video.
              </Text>
              <Button variant="filled" onClick={handleStartVideo}>
                Watch video
              </Button>
            </>
          ) : (
            <>
              {/** Portrait frame 9:16; video mounts only after “Watch video” (no autoplay). */}
              <Box
                mx="auto"
                style={{
                  height: "min(52vh, 420px)",
                  width: "min(100%, calc(min(52vh, 420px) * 9 / 16))",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--mantine-color-dark-9)",
                }}
              >
                <video
                  key={videoMountKey}
                  src={REWARD_VIDEO_SRC}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  onEnded={() => setVideoEnded(true)}
                  onPlay={() => setVideoEnded(false)}
                />
              </Box>
              <Button
                disabled={!videoEnded || claimLoading}
                loading={claimLoading}
                onClick={() => void claimVideoHeart()}
              >
                Claim 1 heart
              </Button>
              {!videoEnded ? (
                <Text size="xs" c="dimmed">
                  Use the player controls to watch until the end, then claim your heart.
                </Text>
              ) : null}
            </>
          )}
        </Stack>

        <Stack gap={6}>
          <Title order={5}>Buy full lives</Title>
          <Text size="sm" c="dimmed">
            Checkout with Stripe to refill all <b>{MAX_HEARTS}</b> hearts instantly.
          </Text>
          <Button
            variant="light"
            onClick={onBuyHearts}
            loading={buyHeartsLoading}
          >
            Buy full lives (card)
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
