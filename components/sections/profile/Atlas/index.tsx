"use client";

import dynamic from "next/dynamic";
import { Box, Loader } from "@mantine/core";
import type { AsciiAtlasProps } from "./atlasProps";

export type { AsciiAtlasProps };

const GlobeCanvas = dynamic<AsciiAtlasProps>(
  () => import("@/components/sections/profile/Atlas/GlobeCanvas"),
  {
    ssr: false,
    loading: () => <Loader size="sm" type="dots" mx="auto" mt="md" />,
  },
);

export default function AsciiAtlas({
  filledCountryCodes = [],
  availableCountryCodes = [],
  artifactsByCountryCode,
}: AsciiAtlasProps) {
  return (
    <Box
      pos="relative"
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16/9",
        overflow: "hidden",
        borderTop: "1px solid var(--mantine-color-dimmed)",
      }}
    >
      <GlobeCanvas
        filledCountryCodes={filledCountryCodes}
        availableCountryCodes={availableCountryCodes}
        artifactsByCountryCode={artifactsByCountryCode}
      />
    </Box>
  );
}
