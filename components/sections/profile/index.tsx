"use client";

import { useEffect, useState } from "react";
import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProfileByUserId } from "@/redux/slices/profileSlice";
import {
  HEART_REFILL_INTERVAL_MS,
  MAX_HEARTS,
} from "@/util/constant";
import AsciiAtlas from "./Atlas";
import { ProfileForm } from "./ProfileForm";

const DEFAULT_DISPLAY = "Ranger";

function heartRefillCaption(
  heartsLeft: number,
  lastHeartReset: string | null,
): string {
  if (heartsLeft >= MAX_HEARTS) {
    return "You're at full hearts.";
  }
  if (!lastHeartReset) {
    return "Next refill time will appear after your first heart is used.";
  }
  const nextMs = new Date(lastHeartReset).getTime() + HEART_REFILL_INTERVAL_MS;
  const delta = nextMs - Date.now();
  if (delta <= 0) {
    return "Hearts should refill soon — refresh if the count looks stale.";
  }
  const hours = Math.ceil(delta / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.ceil(delta / (24 * 60 * 60 * 1000));
    return `Next refill in about ${days} day${days === 1 ? "" : "s"}.`;
  }
  if (hours >= 1) {
    return `Next refill in about ${hours} hour${hours === 1 ? "" : "s"}.`;
  }
  const mins = Math.max(1, Math.ceil(delta / (60 * 1000)));
  return `Next refill in about ${mins} minute${mins === 1 ? "" : "s"}.`;
}

const ProfileSection = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.profile.profile);
  const unlockedCountryCodes = useAppSelector(
    (state) => state.profile.unlockedCountryCodes,
  );
  const availableCountryCodes = useAppSelector(
    (state) => state.profile.availableCountryCodes,
  );
  const artifactsByCountryCode = useAppSelector(
    (state) => state.profile.artifactsByCountryCode,
  );
  const profileStatus = useAppSelector((state) => state.profile.status);
  const collectedArtifactCount = useAppSelector(
    (state) => state.profile.collectedArtifactCount,
  );
  const [initialProfileFetchDone, setInitialProfileFetchDone] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setInitialProfileFetchDone(false));
    return () => cancelAnimationFrame(id);
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    dispatch(fetchProfileByUserId(authUser.id));
  }, [dispatch, authUser?.id]);

  useEffect(() => {
    if (profileStatus !== "succeeded" && profileStatus !== "failed") return;
    const id = requestAnimationFrame(() => setInitialProfileFetchDone(true));
    return () => cancelAnimationFrame(id);
  }, [profileStatus]);

  const displayName =
    profile?.username?.trim() ? profile.username.trim() : DEFAULT_DISPLAY;

  const hasUsername = Boolean(profile?.username?.trim());
  const waitingOnProfile =
    Boolean(authUser) && !hasUsername && !initialProfileFetchDone;
  const showUsernameSetup =
    Boolean(authUser) && !hasUsername && initialProfileFetchDone;

  const heartsLeft = Math.min(
    MAX_HEARTS,
    Math.max(0, profile?.hearts ?? MAX_HEARTS),
  );
  const showRangerStats = Boolean(authUser) && initialProfileFetchDone;

  return (
    <Stack gap="md">
      <Title order={2}>{`${displayName}'s Profile`}</Title>

      {!authUser ? (
        <Text c="dimmed" size="sm">
          Log in first to create or edit your profile.
        </Text>
      ) : null}

      {waitingOnProfile ? <Loader size="sm" type="dots" /> : null}

      {showUsernameSetup ? (
        <Stack gap="sm">
          <Text size="sm">
            You haven&apos;t set a username yet — add one now so your ranger identity shows up across Pokemu.
          </Text>
          <ProfileForm />
        </Stack>
      ) : null}

      {showRangerStats ? (
        <Stack gap="sm" mt="xs">
          <Stack gap={4}>
            <Title order={4}>
              Hearts
            </Title>
            <Group gap="xs" align="center" wrap="wrap">
              <Text size="sm" c="dimmed">
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
            <Text size="xs" c="dimmed">
              {heartRefillCaption(heartsLeft, profile?.last_heart_reset ?? null)}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Title order={4}>
              Artifacts restored
            </Title>
            <Text size="sm" c="dimmed">
              {collectedArtifactCount} item
              {collectedArtifactCount === 1 ? "" : "s"} scavanged
            </Text>
          </Stack>
          <AsciiAtlas
            filledCountryCodes={unlockedCountryCodes}
            availableCountryCodes={availableCountryCodes}
            artifactsByCountryCode={artifactsByCountryCode}
          />
        </Stack>
      ) : null}
    </Stack>
  );
};

export default ProfileSection;
