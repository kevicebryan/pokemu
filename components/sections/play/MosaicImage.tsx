"use client";

import { useId } from "react";

interface Props {
  src: string;
  elapsedSeconds?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function MosaicImage({ src, elapsedSeconds = 0, style, className }: Props) {
  const stage = Math.floor(elapsedSeconds / 20); // 0,1,2,3...
  const filterId = useId().replace(/:/g, "");
  const cellSize = Math.max(2, 18 - stage * 4);
  const dilateRadius = Math.max(0, 8 - stage * 2);
  const brightness = Math.min(1, 0.55 + stage * 0.12);
  const isClear = stage >= 4;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "fit-content",
          height: "fit-content",
          maxWidth: "100%",
          maxHeight: "100%",
          lineHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg width="0" height="0" style={{ position: "fixed" }} aria-hidden>
            <filter id={filterId} x="0" y="0" width="100%" height="100%">
              <feFlood x="0" y="0" width={cellSize} height={cellSize} />
              <feComposite width={cellSize * 3} height={cellSize * 3} />
              <feTile result="pixel-grid" />
              <feComposite in="SourceGraphic" in2="pixel-grid" operator="in" />
              <feMorphology operator="dilate" radius={dilateRadius} />
            </filter>
          </svg>
          <img
            src={src}
            alt="mosaic artifact"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              filter: isClear ? "none" : `url(#${filterId}) brightness(${brightness})`,
              transition: "filter 500ms ease",
              ...style,
            }}
            className={className}
          />
        </div>
      </div>
    </div>
  );
}
