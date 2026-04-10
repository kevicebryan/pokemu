"use client";

import { Box, Loader, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "done" | "error";

interface Props {
    src: string;
    /** Pixel art output resolution (default 64x64) */
    size?: number;
    style?: React.CSSProperties;
    className?: string;
}

export default function MosaicImage({ src, size = 64, style, className }: Props) {
    const [status, setStatus] = useState<Status>("idle");
    const [mosaicSrc, setMosaicSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const prevSrc = useRef<string | null>(null);

    useEffect(() => {
        if (!src || src === prevSrc.current) return;
        prevSrc.current = src;

        let cancelled = false;
        setStatus("loading");
        setMosaicSrc(null);
        setError(null);

        (async () => {
            try {
                const res = await fetch("/api/pixellab", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageUrl: src, size }),
                });

                if (cancelled) return;

                if (!res.ok) {
                    const { error: msg } = await res.json();
                    throw new Error(msg ?? `HTTP ${res.status}`);
                }

                const data = await res.json();
                const b64 = data?.base64;
                if (!b64) throw new Error("No image in response");

                setMosaicSrc(`data:image/png;base64,${b64}`);
                setStatus("done");
            } catch (e: unknown) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Unknown error");
                    setStatus("error");
                }
            }
        })();

        return () => { cancelled = true; };
    }, [src, size]);

    if (status === "loading") {
        return (
            <Box style={{ display: "flex", alignItems: "center", justifyContent: "center", ...style }} className={className}>
                <Loader size="sm" />
            </Box>
        );
    }

    if (status === "error") {
        return (
            <Box style={{ display: "flex", alignItems: "center", justifyContent: "center", ...style }} className={className}>
                <Text size="xs" c="red">{error}</Text>
            </Box>
        );
    }

    if (status === "done" && mosaicSrc) {
        return (
            <img
                src={mosaicSrc}
                alt="mosaic"
                style={{ imageRendering: "pixelated", width: "100%", height: "100%", objectFit: "contain", ...style }}
                className={className}
            />
        );
    }

    return null;
}
