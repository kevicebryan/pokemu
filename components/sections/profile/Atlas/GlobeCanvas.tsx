"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useMantineTheme } from "@mantine/core";
import { useMemo, useState } from "react";
import * as THREE from "three";
import countries from "world-countries";
import type { AsciiAtlasProps } from "./atlasProps";
import { formatCountryLabel } from "@/util/country";

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
  countryCode: string;
  artifactLabel?: string;
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function Marker({ lat, lng, color, radius = 1.02, countryCode, artifactLabel }: MarkerProps) {
  const position = useMemo(() => latLngToVector3(lat, lng, radius), [lat, lng, radius]);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        renderOrder={2}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
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
      {hovered ? (
        <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(0, 0, 0, 0.72)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 3,
              padding: "1px 4px",
              fontSize: 5,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              maxWidth: 80,
              overflow: "hidden",
              textOverflow: "ellipsis",
              transform: "translateY(-8px)",
            }}
          >
            <div>{artifactLabel ?? "Artifact"}</div>
            <div style={{ opacity: 0.75 }}>{formatCountryLabel(countryCode)}</div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

type GlobeProps = Required<Pick<AsciiAtlasProps, "filledCountryCodes" | "availableCountryCodes">> &
  Pick<AsciiAtlasProps, "artifactsByCountryCode">;

const EARTH_DAY_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const EARTH_NIGHT_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
const EARTH_BUMP_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-topology.png";

function getTimezoneRotationOffsetY(): number {
  const timeZoneOffsetMinutes = new Date().getTimezoneOffset() || 0;
  const maxOffsetMinutes = 60 * 12;
  return Math.PI * (timeZoneOffsetMinutes / maxOffsetMinutes);
}

function Globe({ filledCountryCodes, availableCountryCodes, artifactsByCountryCode }: GlobeProps) {
  const theme = useMantineTheme();
  const { dayTexture, nightTexture, bumpTexture } = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const day = loader.load(EARTH_DAY_TEXTURE_URL);
    const night = loader.load(EARTH_NIGHT_TEXTURE_URL);
    const bump = loader.load(EARTH_BUMP_TEXTURE_URL);

    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    night.anisotropy = 8;
    bump.anisotropy = 8;

    return { dayTexture: day, nightTexture: night, bumpTexture: bump };
  }, []);
  const rotationOffsetY = useMemo(() => getTimezoneRotationOffsetY(), []);

  const unlocked = useMemo(
    () => new Set(filledCountryCodes.map((code) => code.toUpperCase())),
    [filledCountryCodes],
  );

  const lockedColor = theme.colors.gray[5];
  const unlockedColor = theme.colors.mistral[6];

  const markers = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ code: string; lat: number; lng: number; artifactLabel?: string }> = [];
    for (const raw of availableCountryCodes) {
      const code = raw.trim().toUpperCase();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const pos = ISO2_TO_LATLNG.get(code);
      if (!pos) continue;
      const artifactValue = artifactsByCountryCode?.[code];
      const artifactLabel = Array.isArray(artifactValue)
        ? artifactValue.filter((v) => typeof v === "string" && v.trim()).join(", ")
        : typeof artifactValue === "string"
          ? artifactValue
          : undefined;
      out.push({ code, lat: pos.lat, lng: pos.lng, artifactLabel });
    }
    return out;
  }, [availableCountryCodes, artifactsByCountryCode]);

  return (
    <group rotation={[0, rotationOffsetY, 0]}>
      <ambientLight intensity={0.36} />
      <directionalLight position={[2.7, 1.4, 2.1]} intensity={1.3} />
      <directionalLight position={[-2.1, -0.8, -1.7]} intensity={0.22} color="#8aa0ff" />

      <group renderOrder={0}>
        {/* Earth: day map + night emissive + relief */}
        <mesh>
          <sphereGeometry args={[0.995, 96, 96]} />
          <meshPhongMaterial
            map={dayTexture}
            bumpMap={bumpTexture}
            bumpScale={0.035}
            emissiveMap={nightTexture}
            emissive="#6e8dff"
            emissiveIntensity={0.24}
            shininess={24}
            specular="#7387a0"
          />
        </mesh>
      </group>

      {markers.map(({ code, lat, lng, artifactLabel }) => (
        <Marker
          key={code}
          lat={lat}
          lng={lng}
          radius={1.02}
          color={unlocked.has(code) ? unlockedColor : lockedColor}
          countryCode={code}
          artifactLabel={artifactLabel}
        />
      ))}
    </group>
  );
}

export default function GlobeCanvas({
  filledCountryCodes,
  availableCountryCodes,
  artifactsByCountryCode,
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
      <Globe
        filledCountryCodes={safeFilled}
        availableCountryCodes={safeAvailable}
        artifactsByCountryCode={artifactsByCountryCode}
      />
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
