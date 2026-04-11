"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useCursor } from "@react-three/drei";
import { useMantineTheme } from "@mantine/core";
import { useMemo, useState } from "react";
import * as THREE from "three";
import countries from "world-countries";
import type { AsciiAtlasProps } from "./atlasProps";
import { countryFlagAndName } from "@/util/country";

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
  mapUrl?: string;
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function Marker({ lat, lng, color, radius = 1.02, countryCode, artifactLabel, mapUrl }: MarkerProps) {
  const position = useMemo(() => latLngToVector3(lat, lng, radius), [lat, lng, radius]);
  const [hovered, setHovered] = useState(false);
  const clickable = Boolean(mapUrl);
  useCursor(hovered && clickable, "pointer", "auto");

  return (
    <group position={position}>
      <mesh
        renderOrder={2}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          if (mapUrl) {
            window.open(mapUrl, "_blank", "noopener,noreferrer");
          }
        }}
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
        <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(0, 0, 0, 0.76)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              padding: "0 3px",
              fontSize: 3.5,
              lineHeight: 1.05,
              whiteSpace: "nowrap",
              maxWidth: 62,
              overflow: "hidden",
              textOverflow: "ellipsis",
              transform: "translateY(-5px)",
            }}
          >
            <div>{artifactLabel ?? "Artifact"}</div>
            <div style={{ opacity: 0.78 }}>{countryFlagAndName(countryCode)}</div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

type GlobeProps = Required<Pick<AsciiAtlasProps, "filledCountryCodes" | "availableCountryCodes">> &
  Pick<AsciiAtlasProps, "artifactsByCountryCode" | "mapUrlByCountryCode">;

const EARTH_DAY_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const EARTH_BUMP_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-topology.png";

function getTimezoneRotationOffsetY(): number {
  const timeZoneOffsetMinutes = new Date().getTimezoneOffset() || 0;
  const maxOffsetMinutes = 60 * 12;
  return Math.PI * (timeZoneOffsetMinutes / maxOffsetMinutes);
}

function Globe({
  filledCountryCodes,
  availableCountryCodes,
  artifactsByCountryCode,
  mapUrlByCountryCode,
}: GlobeProps) {
  const theme = useMantineTheme();
  const { dayTexture, bumpTexture } = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const day = loader.load(EARTH_DAY_TEXTURE_URL);
    const bump = loader.load(EARTH_BUMP_TEXTURE_URL);

    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    bump.anisotropy = 8;

    return { dayTexture: day, bumpTexture: bump };
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
    const out: Array<{
      code: string;
      lat: number;
      lng: number;
      artifactLabel?: string;
      mapUrl?: string;
    }> = [];
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
      const rawMap = mapUrlByCountryCode?.[code];
      const mapUrl = typeof rawMap === "string" && rawMap.trim() ? rawMap.trim() : undefined;
      out.push({ code, lat: pos.lat, lng: pos.lng, artifactLabel, mapUrl });
    }
    return out;
  }, [availableCountryCodes, artifactsByCountryCode, mapUrlByCountryCode]);

  return (
    <group rotation={[0, rotationOffsetY, 0]}>
      {/* Strong, even fill — full “day” look (no night / city-lights layer). */}
      <ambientLight intensity={0.68} />
      <hemisphereLight args={["#f0f7ff", "#202028", 0.52]} />
      <directionalLight position={[3.2, 1.6, 2.5]} intensity={2.15} color="#ffffff" />
      <directionalLight position={[-2.2, -0.5, -1.8]} intensity={0.32} color="#d0dcff" />

      <group renderOrder={0}>
        <mesh>
          <sphereGeometry args={[0.995, 96, 96]} />
          <meshStandardMaterial
            map={dayTexture}
            bumpMap={bumpTexture}
            bumpScale={0.03}
            roughness={0.55}
            metalness={0}
          />
        </mesh>
      </group>

      {markers.map(({ code, lat, lng, artifactLabel, mapUrl }) => (
        <Marker
          key={code}
          lat={lat}
          lng={lng}
          radius={1.02}
          color={unlocked.has(code) ? unlockedColor : lockedColor}
          countryCode={code}
          artifactLabel={artifactLabel}
          mapUrl={mapUrl}
        />
      ))}
    </group>
  );
}

export default function GlobeCanvas({
  filledCountryCodes,
  availableCountryCodes,
  artifactsByCountryCode,
  mapUrlByCountryCode,
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
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.28,
      }}
      camera={{ position: [0, 0, 2.75], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent", imageRendering: "pixelated" }}
    >
      <Globe
        filledCountryCodes={safeFilled}
        availableCountryCodes={safeAvailable}
        artifactsByCountryCode={artifactsByCountryCode}
        mapUrlByCountryCode={mapUrlByCountryCode}
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
