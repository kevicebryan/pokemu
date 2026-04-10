'use client'
import { ActionIcon, Box, Grid, Loader, Modal, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch } from "@/redux/hooks";
import { unlockArtifact } from "@/redux/slices/collectionSlice";
import styles from "./Upload.module.css";

type ScannedArtifact = {
    id: string;
    name: string;
    objectUrl: string;   // blob URL of the original uploaded image
    alreadyOwned: boolean;
    scannedAt: Date;
};

function formatTime(date: Date): string {
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
}

export default function Upload() {
    const [scanned, setScanned] = useState<ScannedArtifact[]>([]);
    const [loading, setLoading] = useState(false);
    const [lightbox, setLightbox] = useState<ScannedArtifact | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dispatch = useAppDispatch();

    // Revoke blob URLs on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            scanned.forEach((s) => URL.revokeObjectURL(s.objectUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFile = async (file: File) => {
        if (!supabase) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res = await fetch("/api/artifacts/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: file.type === "image/png" ? "image/png" : "image/jpeg",
                    accessToken: session.access_token,
                }),
            });

            const data = await res.json();

            if (data.error) {
                notifications.show({
                    color: "red",
                    icon: <IconX size={16} />,
                    title: "Scan failed",
                    message: data.error,
                });
            } else if (data.matched && data.artifact) {
                const artifact = data.artifact as Record<string, unknown>;
                const alreadyOwned = !!data.alreadyOwned;
                const entry: ScannedArtifact = {
                    id: String(artifact.id),
                    name: String(artifact.name ?? ""),
                    objectUrl: URL.createObjectURL(file),
                    alreadyOwned,
                    scannedAt: new Date(),
                };
                setScanned((prev) => [entry, ...prev]);
                if (!alreadyOwned) {
                    dispatch(unlockArtifact(String(artifact.id)));
                    notifications.show({
                        color: "teal",
                        icon: <IconCheck size={16} />,
                        title: "Artifact unlocked!",
                        message: `"${entry.name}" has been added to your collection.`,
                    });
                } else {
                    notifications.show({
                        color: "blue",
                        icon: <IconCheck size={16} />,
                        title: "Already in your collection",
                        message: `"${entry.name}" is already yours.`,
                    });
                }
            } else {
                notifications.show({
                    color: "orange",
                    icon: <IconX size={16} />,
                    title: "No match found",
                    message: data.message ?? "This image doesn't match any artifact in our library.",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p="md" style={{ position: "relative", minHeight: "calc(100dvh - 64px)" }}>
            {scanned.length === 0 && !loading && (
                <Box
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                    }}
                >
                    <Text c="dimmed" size="sm">No scans yet — tap + to scan an artifact</Text>
                </Box>
            )}

            <Grid gap={{ base: "sm", md: "md" }} align="stretch">
                {scanned.map((item, i) => (
                    <Grid.Col key={item.id + i} span={{ base: 6, sm: 3 }}>
                        <button
                            type="button"
                            className={styles.gridCard}
                            onClick={() => setLightbox(item)}
                            aria-label={`View ${item.name}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.objectUrl} alt={item.name} className={styles.thumb} draggable={false} />
                            <div className={styles.cardMeta}>
                                <Text size="xs" fw={600} lineClamp={1}>{item.name}</Text>
                                <Text size="xs" c="dimmed">{formatTime(item.scannedAt)}</Text>
                            </div>
                        </button>
                    </Grid.Col>
                ))}
            </Grid>

            {/* Lightbox */}
            <Modal
                opened={!!lightbox}
                onClose={() => setLightbox(null)}
                title={lightbox?.name}
                centered
                size="lg"
                radius={0}
                overlayProps={{ backgroundOpacity: 0.55 }}
            >
                {lightbox && (
                    <Stack gap="sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={lightbox.objectUrl} alt={lightbox.name} className={styles.realPhoto} />
                        <Text size="sm" c="dimmed">
                            Scanned {lightbox.scannedAt.toLocaleString()}
                        </Text>
                        {lightbox.alreadyOwned && (
                            <Text size="sm" c="dimmed">Already in your collection</Text>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                }}
            />

            {/* Floating + button */}
            <Tooltip label="Scan an artifact" position="left">
                <ActionIcon
                    size={56}
                    radius="xl"
                    onClick={() => !loading && inputRef.current?.click()}
                    style={{
                        position: "fixed",
                        bottom: 32,
                        right: 32,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    }}
                >
                    {loading ? <Loader size={22} color="white" /> : <IconPlus size={28} />}
                </ActionIcon>
            </Tooltip>
        </Box>
    );
}
