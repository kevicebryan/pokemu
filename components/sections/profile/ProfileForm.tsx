"use client";

import { useEffect, useState } from "react";
import { Box, Button, Stack, Text, TextInput } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProfileByUserId, upsertProfile } from "@/redux/slices/profileSlice";
import styles from "./ProfileSection.module.css";

export function ProfileForm() {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.profile.profile);
  const profileStatus = useAppSelector((state) => state.profile.status);
  const profileError = useAppSelector((state) => state.profile.error);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!authUser?.id) {
      return;
    }
    dispatch(fetchProfileByUserId(authUser.id));
  }, [dispatch, authUser?.id]);

  const usernameValue = usernameDraft ?? profile?.username ?? "";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser?.id) {
      return;
    }
    setStatus("");
    await dispatch(
      upsertProfile({
        id: authUser.id,
        username: usernameValue.trim(),
      }),
    );
    setUsernameDraft(null);
    setStatus("Profile saved.");
  };

  if (!authUser) {
    return (
      <Text className={styles.copy}>Login first to create or edit your profile.</Text>
    );
  }

  return (
    <Stack gap="sm">
      <Box component="form" className={styles.form} onSubmit={onSubmit}>
        <TextInput
          required
          label="Username"
          value={usernameValue}
          onChange={(event) => setUsernameDraft(event.currentTarget.value)}
          maxLength={32}
        />
        <Button type="submit" color="orange" loading={profileStatus === "loading"}>
          Save Profile
        </Button>
      </Box>

      <Text className={styles.stats}>
        Hearts: {profile?.hearts ?? 0} | Items Restored: {profile?.total_items_restored ?? 0}
      </Text>
      {profileError && <Text className={styles.error}>{profileError}</Text>}
      {status && <Text className={styles.status}>{status}</Text>}
    </Stack>
  );
}
