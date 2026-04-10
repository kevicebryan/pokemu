"use client";

import { useCallback, useRef, useState } from "react";
import { Box, BoxProps, Image } from "@mantine/core";

const MAX_TILT = 12;

export interface ParallaxImageProps extends Omit<BoxProps, "children"> {
  src: string;
  alt: string;
}

const ParallaxImage = ({ src, alt, style, ...props }: ParallaxImageProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -MAX_TILT;
    const rotateY = ((x - cx) / cx) * MAX_TILT;

    setTilt(
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`,
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  }, []);

  return (
    <Box
      ref={rootRef}
      pos="relative"
      w="100%"
      style={{
        aspectRatio: "1",
        ...((style as React.CSSProperties) ?? {}),
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <Box
        h="100%"
        w="100%"
        style={{
          perspective: "800px",
          transformStyle: "preserve-3d",
        }}
      >
        <Box
          h="100%"
          w="100%"
          display="flex"
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: tilt,
            transformStyle: "preserve-3d",
            transition: "transform 0.12s ease-out",
            willChange: "transform",
          }}
        >
          <Image
            src={src}
            alt={alt}
            fit="contain"
            h="100%"
            w="100%"
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ParallaxImage;
