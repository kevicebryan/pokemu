"use client";

import Link from "next/link";
import { Box, Card, Image, Stack, Text } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import {
  resolveEffectiveRoomBgSlug,
  roomBgSlugToUrl,
} from "@/lib/roomBackground";
import type { OtherRoomOwner } from "@/lib/roomDecorations";

type RoomCardProps = {
  owner: OtherRoomOwner;
};

const RoomCard = ({ owner }: RoomCardProps) => {
  const hasUsername = Boolean(owner.username?.trim());
  const displayName = hasUsername
    ? owner.username!.trim()
    : `Ranger ${owner.userId.slice(0, 8)}…`;

  const artifactLabel =
    owner.decorationCount === 1 ? "1 artifact" : `${owner.decorationCount} artifacts`;

  const previewWallpaperUrl = roomBgSlugToUrl(
    resolveEffectiveRoomBgSlug(owner.room_bg, null),
  );

  return (
    <Card
      component={Link}
      href={`/dashboard/room/${owner.userId}`}
      withBorder
      padding="sm"
      aria-label={`View ${displayName}'s room, ${artifactLabel}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "var(--mantine-shadow-md)",
          },
        },
      }}
    >
      <Stack gap="xs">
        <Box
          pos="relative"
          w="100%"
          style={{
            aspectRatio: "1 / 1",
            border: "4px solid var(--mantine-color-mistral-6)",
            backgroundColor: "var(--mantine-color-dark-7)",
            backgroundImage: `url(${previewWallpaperUrl})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            overflow: "hidden",
            borderRadius: 4,
          }}
        >
          {owner.previewImageUrl ? (
            <Image
              src={owner.previewImageUrl}
              alt=""
              fit="contain"
              w="45%"
              h="45%"
              pos="absolute"
              left="50%"
              top="50%"
              style={{
                transform: "translate(-50%, -50%)",
                imageRendering: "pixelated",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </Box>
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Ranger
          </Text>
          <Text size="sm" fw={700} lineClamp={2}>
            {displayName}
          </Text>
          {!hasUsername ? (
            <Text size="xs" c="dimmed">
              Set a username in Profile to show your name here.
            </Text>
          ) : null}
          <Text size="sm" c="dimmed">
            {artifactLabel} in this room
          </Text>
          <Text size="xs" c="mistral" fw={600} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            View room
            <IconChevronRight size={14} aria-hidden />
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
};

export default RoomCard;
