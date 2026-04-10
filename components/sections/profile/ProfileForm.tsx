"use client";

import { useState } from "react";
import { Box, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { upsertProfile } from "@/redux/slices/profileSlice";

export function ProfileForm() {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.profile.profile);
  const profileStatus = useAppSelector((state) => state.profile.status);
  const profileError = useAppSelector((state) => state.profile.error);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const usernameValue = usernameDraft ?? profile?.username ?? "";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser?.id) {
      return;
    }
    setStatus("");
    const result = await dispatch(
      upsertProfile({
        id: authUser.id,
        username: usernameValue.trim(),
      }),
    );
    setUsernameDraft(null);
    if (upsertProfile.fulfilled.match(result)) {
      setStatus("Profile saved.");
    }
  };

  if (!authUser) {
    return null;
  }

  return (
    <Stack gap="sm">
      <Box component="form" onSubmit={onSubmit}>
        <Group justify="space-between" align="flex-end">
          <TextInput
            required
            label="Username"
            value={usernameValue}
            onChange={(event) => setUsernameDraft(event.currentTarget.value)}
            flex={1}
          />
          <Button type="submit" loading={profileStatus === "loading"}>
            Save Profile
          </Button>
        </Group>
      </Box>
      {profileError && <Text c="red">{profileError}</Text>}
      {status && <Text c="dimmed">{status}</Text>}
    </Stack>
  );
}
