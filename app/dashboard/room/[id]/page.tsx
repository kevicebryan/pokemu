"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Anchor, Box, Group, Stack, Text } from "@mantine/core";
import RoomBox from "@/components/sections/room/RoomBox";
import { IconArrowLeft } from "@tabler/icons-react";

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
        <Group gap="xs">
          <IconArrowLeft />
          <Text size="lg">Back to room</Text>
        </Group>
      </Anchor>
      <Box w={"75%"}>
        <RoomBox roomOwnerUserId={id} fullWidth />
      </Box>
    </Stack>
  );
};

export default UserRoomPage;
