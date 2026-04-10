"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Group,
  Image,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import type { CollectionArtifact } from "@/lib/types/collection";
import {
  addRoomDecoration,
  clampDecorationCenterPct,
  fetchRoomDecorations,
  ROOM_DECORATION_TILE_HALF_PCT,
  ROOM_DECORATION_TILE_PCT,
  type RoomDecoration,
  syncRoomDecorationsToDatabase,
} from "@/lib/roomDecorations";
import {
  clearRoomBgSlug,
  isRoomBgStyleSlug,
  readRoomBgSlug,
  ROOM_BG_STYLE_SLUGS,
  roomBgSlugToUrl,
  writeRoomBgSlug,
} from "@/lib/roomBackground";
import { useAppSelector } from "@/redux/hooks";
import { POKEMU_ROOM_BG_STORAGE_KEY, ROOM_BG_IMAGE_URL } from "@/util/constant";

type RoomBgChoice = {
  key: string;
  slug: string | null;
  label: string;
  thumbSrc: string;
};

const ROOM_BG_CHOICES: RoomBgChoice[] = [
  {
    key: "classic",
    slug: null,
    label: "Classic",
    thumbSrc: ROOM_BG_IMAGE_URL,
  },
  ...ROOM_BG_STYLE_SLUGS.map((slug) => ({
    key: slug,
    slug,
    label: slug,
    thumbSrc: `/images/rooms_bg/${slug}.png`,
  })),
];

type RoomBoxProps = {
  /** Profile / auth user id of the room owner whose decorations we load. */
  roomOwnerUserId: string;
  /** When true, room canvas uses full width (e.g. dedicated visit page). */
  fullWidth?: boolean;
};

function pctToBoxStyle(pos_left_pct: number, pos_top_pct: number) {
  const half = ROOM_DECORATION_TILE_HALF_PCT;
  return {
    left: `calc(${pos_left_pct}% - ${half}%)`,
    top: `calc(${pos_top_pct}% - ${half}%)`,
    width: `${ROOM_DECORATION_TILE_PCT}%`,
    height: `${ROOM_DECORATION_TILE_PCT}%`,
  };
}

type DragSession = {
  id: string;
  startClientX: number;
  startClientY: number;
  originLeft: number;
  originTop: number;
};

export default function RoomBox({
  roomOwnerUserId,
  fullWidth = false,
}: RoomBoxProps) {
  const currentUserId = useAppSelector((s) => s.auth.user?.id ?? null);
  const canEdit = Boolean(
    currentUserId && roomOwnerUserId && currentUserId === roomOwnerUserId,
  );

  const { items, unlockedIds } = useAppSelector((s) => s.collection);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);

  const [decorations, setDecorations] = useState<RoomDecoration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [roomSurfaceBg, setRoomSurfaceBg] = useState(() => {
    if (typeof window === "undefined") {
      return { url: ROOM_BG_IMAGE_URL, slug: null as string | null };
    }
    const raw = readRoomBgSlug();
    if (raw && !isRoomBgStyleSlug(raw)) {
      clearRoomBgSlug();
      return { url: ROOM_BG_IMAGE_URL, slug: null };
    }
    return { url: roomBgSlugToUrl(raw), slug: raw };
  });

  const reload = useCallback(async () => {
    const { data, error } = await fetchRoomDecorations(roomOwnerUserId);
    if (error) {
      setLoadError(error);
      setDecorations([]);
    } else {
      setLoadError(null);
      setDecorations(data);
    }
    setLayoutDirty(false);
  }, [roomOwnerUserId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await fetchRoomDecorations(roomOwnerUserId);
      if (cancelled) return;
      if (error) {
        setLoadError(error);
        setDecorations([]);
      } else {
        setLoadError(null);
        setDecorations(data);
      }
      setLayoutDirty(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomOwnerUserId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== POKEMU_ROOM_BG_STORAGE_KEY) return;
      const next = e.newValue?.trim() ?? null;
      setRoomSurfaceBg({
        url: roomBgSlugToUrl(next),
        slug: next && isRoomBgStyleSlug(next) ? next : null,
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const selectRoomBg = (slug: string | null) => {
    if (slug == null) {
      clearRoomBgSlug();
      setRoomSurfaceBg({ url: ROOM_BG_IMAGE_URL, slug: null });
      return;
    }
    writeRoomBgSlug(slug);
    setRoomSurfaceBg({ url: roomBgSlugToUrl(slug), slug });
  };

  const placedIds = new Set(decorations.map((d) => d.artifact_id));
  const unlockedSet = new Set(unlockedIds);

  const addableArtifacts = items.filter(
    (a) => unlockedSet.has(a.id) && !placedIds.has(a.id),
  );

  const handleAddArtifact = async (artifact: CollectionArtifact) => {
    if (!canEdit) return;
    setAddingId(artifact.id);
    const { error } = await addRoomDecoration(roomOwnerUserId, artifact.id);
    setAddingId(null);
    if (error) {
      notifications.show({
        title: "Could not add artifact",
        message: error,
        color: "red",
      });
      return;
    }
    notifications.show({
      title: "Added to room",
      message: artifact.title,
      color: "mistral",
    });
    closeAdd();
    void reload();
  };

  const handleSaveLayout = async () => {
    if (!canEdit || !layoutDirty) return;
    setSavingLayout(true);
    const { error } = await syncRoomDecorationsToDatabase(
      roomOwnerUserId,
      decorations.map((d) => ({
        id: d.id,
        pos_left_pct: d.pos_left_pct,
        pos_top_pct: d.pos_top_pct,
      })),
    );
    setSavingLayout(false);
    if (error) {
      notifications.show({
        title: "Could not save room",
        message: error,
        color: "red",
      });
      void reload();
      return;
    }
    setLayoutDirty(false);
    notifications.show({
      title: "Room saved",
      message: "Your layout is saved.",
      color: "mistral",
    });
    void reload();
  };

  const handleDecorationPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    d: RoomDecoration,
  ) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragSessionRef.current = {
      id: d.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originLeft: d.pos_left_pct,
      originTop: d.pos_top_pct,
    };
    setDraggingId(d.id);
  };

  const handleDecorationPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    const session = dragSessionRef.current;
    if (!session || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 1 || h < 1) return;

    const dxPct = ((e.clientX - session.startClientX) / w) * 100;
    const dyPct = ((e.clientY - session.startClientY) / h) * 100;
    const next = clampDecorationCenterPct(
      session.originLeft + dxPct,
      session.originTop + dyPct,
      ROOM_DECORATION_TILE_HALF_PCT,
    );

    setDecorations((prev) =>
      prev.map((x) =>
        x.id === session.id
          ? {
            ...x,
            pos_left_pct: next.pos_left_pct,
            pos_top_pct: next.pos_top_pct,
          }
          : x,
      ),
    );
  };

  const endDecorationDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragSessionRef.current) return;
    dragSessionRef.current = null;
    setDraggingId(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setLayoutDirty(true);
  };

  const hideViewOnlyHint = fullWidth && !canEdit;

  return (
    <Stack gap="sm">

      {hideViewOnlyHint ? null : canEdit ? (
        <Stack gap={"xs"}>
          <Group gap="sm" wrap="wrap">
            <Button onClick={openAdd} size="sm" variant="outline">
              Add artifact
            </Button>
            <Button
              onClick={() => void handleSaveLayout()}
              size="sm"
              variant="filled"
              color="mistral"
              disabled={!layoutDirty || savingLayout}
              loading={savingLayout}
            >
              Save layout
            </Button>
          </Group>
          {layoutDirty ? (
            <Text size="xs" c="dimmed">
              You have unsaved changes — click Save layout to persist positions.
            </Text>
          ) : null}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          You can only arrange artifacts in your own room.
        </Text>
      )}

      <Flex
        gap="md"
        direction={{ base: "column", sm: "row" }}
        align="stretch"
        wrap="nowrap"
      >
        <Box
          ref={containerRef}
          pos="relative"
          flex={fullWidth ? "1 1 100%" : "1 1 auto"}
          maw={{ base: "100%", sm: fullWidth ? "100%" : "50%" }}
          w={{ base: "100%", sm: fullWidth ? "100%" : undefined }}
          miw={0}
          style={{
            aspectRatio: "1 / 1",
            border: "6px solid var(--mantine-color-mistral-6)",
            backgroundColor: "var(--mantine-color-dark-7)",
            backgroundImage: `url(${roomSurfaceBg.url})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Loader color="mistral" pos="absolute" left="50%" top="50%" style={{ transform: "translate(-50%, -50%)" }} />
          ) : null}

          {!loading && loadError ? (
            <Text size="sm" c="red" p="md">
              {loadError}
            </Text>
          ) : null}

          {!loading && !loadError && decorations.length === 0 ? (
            <Text size="sm" c="dimmed" pos="absolute" left="50%" top="50%" style={{ transform: "translate(-50%, -50%)" }} ta="center" px="md">
              {canEdit
                ? "Add artifacts from your collection to decorate this room."
                : "This room has no decorations yet."}
            </Text>
          ) : null}

          {decorations.map((d) => {
            const box = pctToBoxStyle(d.pos_left_pct, d.pos_top_pct);
            const src = d.art_image_url;
            const isDragging = draggingId === d.id;
            return (
              <Box
                key={d.id}
                component="div"
                pos="absolute"
                style={{
                  ...box,
                  cursor: canEdit ? (isDragging ? "grabbing" : "grab") : "default",
                  touchAction: "none",
                  zIndex: isDragging ? 20 : 1,
                  transform: isDragging ? "scale(1.2)" : undefined,
                  transition: isDragging ? undefined : "transform 0.12s ease",
                }}
                onPointerDown={(e) => handleDecorationPointerDown(e, d)}
                onPointerMove={handleDecorationPointerMove}
                onPointerUp={endDecorationDrag}
                onPointerCancel={endDecorationDrag}
              >
                {src ? (
                  <Image
                    src={src}
                    alt={d.title}
                    fit="contain"
                    w="100%"
                    h="100%"
                    draggable={false}
                    style={{
                      imageRendering: "pixelated",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  />
                ) : (
                  <Box
                    w="100%"
                    h="100%"
                    bg="dark.5"
                    style={{ borderRadius: 4 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {canEdit ? (
          <Flex
            direction="column"
            gap="xs"
            w={{ base: "100%", sm: 108 }}
            maw={{ base: "100%", sm: 120 }}
            miw={0}
            style={{ flexShrink: 0 }}
            h={{ sm: "100%" }}
            align="stretch"
          >
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Room style
            </Text>
            <Box
              hiddenFrom="sm"
              w="100%"
              style={{
                overflowX: "auto",
                overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <Flex gap="sm" wrap="nowrap" w="max-content" pb={4}>
                {ROOM_BG_CHOICES.map((choice) => {
                  const active =
                    choice.slug == null
                      ? roomSurfaceBg.slug == null
                      : roomSurfaceBg.slug === choice.slug;
                  return (
                    <UnstyledButton
                      key={choice.key}
                      type="button"
                      onClick={() => selectRoomBg(choice.slug)}
                      style={{ flexShrink: 0, width: 88, textAlign: "left" }}
                    >
                      <Stack gap={6}>
                        <Box
                          style={{
                            aspectRatio: 1,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: active
                              ? "3px solid var(--mantine-color-mistral-6)"
                              : "2px solid var(--mantine-color-dark-4)",
                          }}
                        >
                          <Image
                            src={choice.thumbSrc}
                            alt=""
                            w="100%"
                            h="100%"
                            fit="cover"
                          />
                        </Box>
                        <Text
                          size="xs"
                          tt={choice.slug ? "capitalize" : undefined}
                          lineClamp={1}
                        >
                          {choice.label}
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  );
                })}
              </Flex>
            </Box>
            <Box
              visibleFrom="sm"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <Stack gap="sm" pr={6}>
                {ROOM_BG_CHOICES.map((choice) => {
                  const active =
                    choice.slug == null
                      ? roomSurfaceBg.slug == null
                      : roomSurfaceBg.slug === choice.slug;
                  return (
                    <UnstyledButton
                      key={choice.key}
                      type="button"
                      onClick={() => selectRoomBg(choice.slug)}
                      style={{ textAlign: "left" }}
                    >
                      <Stack gap={6}>
                        <Box
                          style={{
                            aspectRatio: 1,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: active
                              ? "3px solid var(--mantine-color-mistral-6)"
                              : "2px solid var(--mantine-color-dark-4)",
                          }}
                        >
                          <Image
                            src={choice.thumbSrc}
                            alt=""
                            w="100%"
                            h="100%"
                            fit="cover"
                          />
                        </Box>
                        <Text
                          size="xs"
                          tt={choice.slug ? "capitalize" : undefined}
                          lineClamp={1}
                        >
                          {choice.label}
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Box>
          </Flex>
        ) : null}
      </Flex>

      <Modal opened={addOpen} onClose={closeAdd} title="Add from collection" size="lg">
        {addableArtifacts.length === 0 ? (
          <Text c="dimmed" size="sm">
            {items.length === 0
              ? "Load your collection first, or collect more artifacts in play."
              : "Every collected artifact is already in this room, or you have nothing left to add."}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            {addableArtifacts.map((artifact) => {
              const src = artifact.pixelImageUrl;
              const busy = addingId === artifact.id;
              return (
                <UnstyledButton
                  key={artifact.id}
                  onClick={() => void handleAddArtifact(artifact)}
                  disabled={busy}
                  style={{ textAlign: "center" }}
                >
                  <Stack gap={6} align="center">
                    <Box
                      w="100%"
                      style={{
                        aspectRatio: "1 / 1",
                        border: "1px solid var(--mantine-color-dark-4)",
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "var(--mantine-color-dark-6)",
                      }}
                    >
                      {src ? (
                        <Image
                          src={src}
                          alt=""
                          fit="contain"
                          w="100%"
                          h="100%"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <Text size="xs" c="dimmed" p="xs">
                          No image
                        </Text>
                      )}
                    </Box>
                    <Text size="xs" lineClamp={2}>
                      {artifact.title}
                    </Text>
                    {busy ? <Loader size="xs" color="mistral" /> : null}
                  </Stack>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        )}
      </Modal>
    </Stack>
  );
}
