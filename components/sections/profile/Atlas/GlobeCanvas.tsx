"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import * as THREE from "three";
import countries from "world-countries";
import type { AsciiAtlasProps } from "./atlasProps";

const ISO2_TO_LATLNG = new Map<string, { lat: number; lng: number }>(
  countries.map((c) => [c.cca2, { lat: c.latlng[0], lng: c.latlng[1] }]),
);

/** Props may be `null` from APIs; default `= []` only applies to `undefined`. */
function asCountryCodeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

type MarkerProps = {
  lat: number;
  lng: number;
  radius?: number;
  color: string;
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function Marker({ lat, lng, color, radius = 1.02 }: MarkerProps) {
  const position = useMemo(() => latLngToVector3(lat, lng, radius), [lat, lng, radius]);

  return (
    <mesh position={position} renderOrder={2}>
      <boxGeometry args={[0.032, 0.032, 0.032]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.45}
        roughness={0.95}
        metalness={0}
        flatShading
      />
    </mesh>
  );
}

type GlobeProps = Required<Pick<AsciiAtlasProps, "filledCountryCodes" | "availableCountryCodes">>;

function Globe({ filledCountryCodes, availableCountryCodes }: GlobeProps) {
  const theme = useMantineTheme();

  const unlocked = useMemo(
    () => new Set(filledCountryCodes.map((code) => code.toUpperCase())),
    [filledCountryCodes],
  );

  const lockedColor = theme.colors.gray[5];
  const unlockedColor = theme.colors.mistral[6];
  /** Translucent outer shell + semi-transparent Mistral wireframe net. */
  const shellColor = "#dcdcdc";
  const netColor = theme.colors.mistral[6];

  const markers = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ code: string; lat: number; lng: number }> = [];
    for (const raw of availableCountryCodes) {
      const code = raw.trim().toUpperCase();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const pos = ISO2_TO_LATLNG.get(code);
      if (!pos) continue;
      out.push({ code, lat: pos.lat, lng: pos.lng });
    }
    return out;
  }, [availableCountryCodes]);

  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[2, 3, 2]} intensity={0.85} />

      <group renderOrder={0}>
        {/* Hollow center — no inner fill; page/background shows through */}
        {/* Outer glassy haze */}
        <mesh>
          <sphereGeometry args={[1, 18, 18]} />
          <meshStandardMaterial
            color={shellColor}
            transparent
            opacity={0.0256}
            roughness={1}
            metalness={0}
            flatShading
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Lo-fi net: Mistral orange, semi-transparent */}
        <mesh>
          <sphereGeometry args={[1, 18, 18]} />
          <meshBasicMaterial
            color={netColor}
            wireframe
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      </group>

      {markers.map(({ code, lat, lng }) => (
        <Marker
          key={code}
          lat={lat}
          lng={lng}
          radius={1.02}
          color={unlocked.has(code) ? unlockedColor : lockedColor}
        />
      ))}
    </>
  );
}

export default function GlobeCanvas({
  filledCountryCodes,
  availableCountryCodes,
}: AsciiAtlasProps) {
  const safeFilled = asCountryCodeList(filledCountryCodes);
  const safeAvailable = asCountryCodeList(availableCountryCodes);

  return (
    <Canvas
      dpr={1}
      gl={{
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
      }}
      camera={{ position: [0, 0, 2.75], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent", imageRendering: "pixelated" }}
    >
      <Globe filledCountryCodes={safeFilled} availableCountryCodes={safeAvailable} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.45}
        enablePan={false}
        minDistance={2}
        maxDistance={3.8}
      />
    </Canvas>
  );
}
