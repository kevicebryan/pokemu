"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Anchor, Stack, Text } from "@mantine/core";
import RoomBox from "@/components/sections/room/RoomBox";

const UserRoomPage = () => {
  const params = useParams();
  const raw = params?.id;
  const id =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw[0]
        : undefined;

  if (!id) {
    return <Text c="red">Invalid room link.</Text>;
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} href="/dashboard/room" size="sm" w="fit-content">
        ← Back to room
      </Anchor>
      <RoomBox roomOwnerUserId={id} fullWidth />
    </Stack>
  );
};

export default UserRoomPage;
