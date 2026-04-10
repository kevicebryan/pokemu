"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Grid,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { CollectionArtifact } from "@/lib/types/collection";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchUserCollection } from "@/redux/slices/collectionSlice";
import styles from "./CollectionView.module.css";

type LockedPixelImageProps = {
  src: string;
};

function LockedPixelImage({ src }: LockedPixelImageProps) {
  return (
    <canvas
      ref={(node) => {
        if (!node) return;
        const ctx = node.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;

        img.onload = () => {
          // Draw tiny, then stretch with nearest-neighbor to get a true pixelated censor.
          const pixelWidth = 18;
          const pixelHeight = 18;
          node.width = pixelWidth;
          node.height = pixelHeight;
          ctx.clearRect(0, 0, pixelWidth, pixelHeight);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
        };
      }}
      className={`${styles.pixelThumb} ${styles.lockedCanvas}`}
      aria-hidden="true"
    />
  );
}

export function CollectionView() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { items, unlockedIds, totalCatalogCount, status, error } = useAppSelector((s) => s.collection);
  const [selected, setSelected] = useState<CollectionArtifact | null>(null);
  const [detailOpen, { open: openDetail, close: closeDetail }] = useDisclosure(false);

  useEffect(() => {
    if (!user?.id) return;
    void dispatch(fetchUserCollection(user.id));
  }, [dispatch, user?.id]);

  const unlockedSet = new Set(unlockedIds);
  const collected = unlockedSet.size;

  const openArtifact = (artifact: CollectionArtifact) => {
    setSelected(artifact);
    openDetail();
  };

  const closeArtifactModal = () => {
    closeDetail();
    setSelected(null);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Title order={2}>Collection</Title>
        <Badge
          classNames={{ label: styles.counterBadge }}
          size="lg"
          variant="outline"
          color="mistral"
          radius={0}
          aria-live="polite"
        >
          {totalCatalogCount > 0 ? `${collected} / ${totalCatalogCount}` : `${collected} / —`}
        </Badge>
      </Group>

      {status === "loading" && items.length === 0 ? (
        <Loader color="mistral" mx="auto" my="xl" />
      ) : null}

      {error ? (
        <Alert color="red" title="Could not load collection" radius={0}>
          {error}
          <Text size="sm" mt="xs" c="dimmed">
            Check that Supabase tables{" "}
            <Text span fw={700} ff="monospace">
              artifacts
            </Text>{" "}
            and{" "}
            <Text span fw={700} ff="monospace">
              user_collections
            </Text>{" "}
            exist and your user id column matches the app (see{" "}
            <Text span ff="monospace">
              USER_COLLECTIONS_USER_COLUMN
            </Text>{" "}
            in{" "}
            <Text span ff="monospace">
              collectionSlice.ts
            </Text>
            ).
          </Text>
        </Alert>
      ) : null}

      {status !== "loading" && !error && items.length === 0 ? (
        <Text c="dimmed">No artifacts in the catalog yet.</Text>
      ) : null}

      {status !== "loading" && !error && items.length > 0 && collected === 0 ? (
        <Text c="dimmed">
          You have not restored any artifacts yet.
        </Text>
      ) : null}

      <Grid gap={{ base: "sm", md: "md" }} align="stretch" justify="flex-start">
        {items.map((artifact) => {
          const isUnlocked = unlockedSet.has(artifact.id);
          const tileImageUrl = artifact.pixelImageUrl || artifact.realImageUrl;
          return (
            <Grid.Col key={artifact.id} span={{ base: 6, sm: 3 }}>
              <Box
                component="button"
                type="button"
                className={`${styles.gridCard} ${!isUnlocked ? styles.lockedCard : ""}`}
                onClick={() => openArtifact(artifact)}
                aria-label={isUnlocked ? `Open ${artifact.title}` : `${artifact.title} is locked`}
              >
                {tileImageUrl ? (
                  isUnlocked ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs; avoids image remotePatterns setup
                    <img src={tileImageUrl} alt="" className={styles.pixelThumb} draggable={false} />
                  ) : (
                    <LockedPixelImage src={tileImageUrl} />
                  )
                ) : (
                  <div className={styles.thumbPlaceholder}>?</div>
                )}
                {!isUnlocked ? <div className={styles.lockedBadge}>Locked</div> : null}
              </Box>
            </Grid.Col>
          );
        })}
      </Grid>

      <Modal
        opened={detailOpen}
        onClose={closeArtifactModal}
        title={<Title order={3}>{selected?.title ?? "Artifact"}</Title>}
        size="lg"
        radius={0}
        centered
        overlayProps={{ backgroundOpacity: 0.55 }}
      >
        {selected ? (
          <Stack gap="md">
            {!unlockedSet.has(selected.id) ? (
              <Text c="dimmed" size="sm">
                This artifact is still locked. Win scavenger rounds to unlock the full photo.
              </Text>
            ) : selected.realImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.realImageUrl}
                alt={selected.title}
                className={styles.realPhoto}
              />
            ) : (
              <Text c="dimmed" size="sm">
                No full-resolution photo for this artifact yet.
              </Text>
            )}
            {selected.facts ? (
              <Text className={styles.facts}>{selected.facts}</Text>
            ) : (
              <Text c="dimmed" size="sm">
                No story or facts added for this artifact yet.
              </Text>
            )}
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
