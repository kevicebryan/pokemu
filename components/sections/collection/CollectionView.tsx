"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  List,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay, IconSearch } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import type { CollectionArtifact } from "@/lib/types/collection";
import { countryCodeToFlagUrl, countryCodeToName } from "@/util/country";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchUserCollection } from "@/redux/slices/collectionSlice";
import { fetchProfileByUserId } from "@/redux/slices/profileSlice";
import styles from "./CollectionView.module.css";

function normalizeCountryCode(code?: string | null): string | null {
  if (!code) return null;
  const cc = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}

function sanitizeHttpsUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Dossier heading link: only Supabase `map_url` (sanitized https). */
function resolveMuseumMapsUrl(artifact: CollectionArtifact): string | null {
  return sanitizeHttpsUrl(artifact.mapUrl);
}

function dossierHeadingText(artifact: CollectionArtifact): string {
  const museum = artifact.museumName?.trim();
  const country =
    artifact.countryName?.trim() ||
    (artifact.countryCode ? countryCodeToName(artifact.countryCode) : "") ||
    "";
  const parts = [museum, country].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Dossier";
}

function DossierPanelHeading({ artifact }: { artifact: CollectionArtifact }) {
  const mapsUrl = resolveMuseumMapsUrl(artifact);
  const text = dossierHeadingText(artifact);
  if (mapsUrl) {
    return (
      <Anchor
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.intelPanelTitleLink}
        underline="hover"
        title="Open map"
      >
        {text}
      </Anchor>
    );
  }
  return text;
}

/**
 * Speaking-head mark (paths from speaking-head-svgrepo-com.svg, Twemoji-style).
 * Rendered as hollow outlines; Mistral strokes via CSS module classes.
 */
function SpeakingHeadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={26}
      height={26}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        className={styles.speakingHeadWaves}
        d="M35.838 23.159a.997.997 0 0 1-.998 1.003l-5 .013a.998.998 0 0 1-1-.997a.998.998 0 0 1 .995-1.004l5-.013a1 1 0 0 1 1.003.998zm-1.587-5.489a1 1 0 0 1-.475 1.333l-4.517 2.145a1 1 0 1 1-.856-1.809l4.516-2.144a1 1 0 0 1 1.332.475zm.027 10.987a1 1 0 0 0-.48-1.33l-4.527-2.122a1 1 0 1 0-.848 1.81l4.526 2.123a1 1 0 0 0 1.329-.481z"
      />
      <path
        className={styles.speakingHeadFace}
        d="M27.979 14.875c-1.42-.419-2.693-1.547-3.136-2.25c-.76-1.208.157-1.521-.153-4.889C24.405 4.653 20.16 1.337 15 1c-2.346-.153-4.786.326-7.286 1.693c-6.42 3.511-8.964 10.932-4.006 18.099c4.47 6.46.276 9.379.276 9.379s.166 1.36 2.914 3.188c2.749 1.827 6.121.588 6.121.588s1.112-3.954 4.748-3.59c2.606.384 6.266-.129 7.191-1.024c.865-.837-.151-1.886.539-4.224c-2.365-.232-3.665-1.359-3.79-2.948c2.625.255 3.708-.578 4.458-1.495c-.021-.54-.075-1.686-.127-2.454c2.322-.672 3.212-2.962 1.941-3.337z"
      />
    </svg>
  );
}

function cancelIntelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Flatten Ranger-style bullets into natural speech. */
function formatIntelForSpeech(raw: string): string {
  return raw
    .replace(/\n-{3,}\n/g, ". ")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Greeting line the narrator speaks first; model body is bullets-only (see gemini-facts prompt). */
function prefixIntelGreeting(profileUsername: string | undefined, factsFromModel: string): string {
  const name = profileUsername?.trim();
  const greet = name ? `Hey, ${name}—` : "Hey, Ranger—";
  return `${greet}\n\n${factsFromModel.trim()}`;
}

type SpeechStatus = "idle" | "playing" | "paused";

/**
 * Pick a deep English voice when available (browser/OS dependent).
 * True "Morgan Freeman" cloning isn't possible client-side; this nudges toward documentary-style male narrators.
 */
function pickNarratorVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en(-|$)/i.test(v.lang));
  const pool = en.length ? en : voices;

  const prefers = [
    /UK English Male/i,
    /English \(United Kingdom\).*Male/i,
    /Microsoft (Mark|David|George|Guy)/i,
    /Google UK English Male/i,
    /Daniel/i,
    /Fred/i,
    /Arthur/i,
    /James/i,
    /Thomas/i,
    /\bMale\b/i,
  ];
  for (const re of prefers) {
    const hit = pool.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  const avoid = /female|zira|samantha|karen|susan|hazel|linda|victoria|martha|aria|jenny/i;
  const fallback = pool.find((v) => !avoid.test(v.name));
  return fallback ?? pool[0] ?? null;
}

/**
 * Browser TTS can only approximate a "documentary narrator" profile (no true timbre/gravel control).
 * Target: deep baritone, slow deliberate pacing, steady authoritative delivery.
 * Texture (gravel) and exact emotional tone require a cloud TTS voice, not SpeechSynthesis.
 */
const NARRATOR_RATE = 1.01;
const NARRATOR_PITCH = 0.79;
const NARRATOR_VOLUME = 1;

function applyNarratorProfile(utterance: SpeechSynthesisUtterance) {
  utterance.rate = NARRATOR_RATE;
  utterance.pitch = NARRATOR_PITCH;
  utterance.volume = NARRATOR_VOLUME;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const assignVoice = () => {
    const v = pickNarratorVoice(window.speechSynthesis.getVoices());
    if (v) utterance.voice = v;
  };

  assignVoice();
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", assignVoice, { once: true });
  }
}

type LockedPixelImageProps = {
  src: string;
};

type ParsedIntel =
  | { mode: "plain"; plain: string }
  | { mode: "structured"; leadIn: string; bullets: string[]; tail: string };

function parseIntelText(text: string): ParsedIntel {
  const trimmed = text.trim();
  if (!trimmed) return { mode: "plain", plain: "" };

  const lines = trimmed.split(/\r?\n/);
  const bullets: string[] = [];
  const preamble: string[] = [];
  const tail: string[] = [];
  let phase: "preamble" | "bullets" | "tail" = "preamble";

  for (const raw of lines) {
    const bulletMatch = raw.match(/^\s*-\s+(.+)$/);
    if (bulletMatch) {
      phase = "bullets";
      bullets.push(bulletMatch[1].trim());
    } else if (!raw.trim()) {
      continue;
    } else {
      const content = raw.trim();
      if (phase === "preamble") preamble.push(content);
      else if (phase === "bullets") {
        phase = "tail";
        tail.push(content);
      } else tail.push(content);
    }
  }

  if (bullets.length === 0) {
    return { mode: "plain", plain: trimmed };
  }

  return {
    mode: "structured",
    leadIn: preamble.join(" "),
    bullets,
    tail: tail.join(" "),
  };
}

function IntelPanel({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Paper radius={0} className={styles.intelPanel} p="md">
      <Box component="h3" className={styles.intelPanelTitle}>
        {label}
      </Box>
      {children}
    </Paper>
  );
}

function IntelBody({ text, variant }: { text: string; variant: "dossier" | "intel" }) {
  const parsed = parseIntelText(text);

  if (parsed.mode === "plain") {
    if (!parsed.plain) return null;
    return (
      <Text className={styles.facts} component="p" m={0}>
        {parsed.plain}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {parsed.leadIn ? (
        <Text
          size="sm"
          m={0}
          className={`${styles.facts} ${variant === "intel" ? styles.intelLeadIn : ""}`}
          fw={variant === "intel" ? 700 : 400}
          c={variant === "intel" ? "mistral.6" : undefined}
        >
          {parsed.leadIn}
        </Text>
      ) : null}
      <List
        type="unordered"
        listStyleType="none"
        spacing="xs"
        size="sm"
        icon={<Box className={styles.bulletSquare} aria-hidden />}
        styles={{
          itemWrapper: {
            alignItems: "flex-start",
          },
        }}
      >
        {parsed.bullets.map((line, i) => (
          <List.Item key={i}>
            <Text className={styles.facts} component="span" style={{ whiteSpace: "pre-wrap" }}>
              {line}
            </Text>
          </List.Item>
        ))}
      </List>
      {parsed.tail ? (
        <Text size="sm" c="dimmed" className={styles.facts} m={0}>
          {parsed.tail}
        </Text>
      ) : null}
    </Stack>
  );
}

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

type CollectionViewProps = {
  initialCountryCode?: string | null;
};

export function CollectionView({ initialCountryCode = null }: CollectionViewProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.profile.profile);
  const { items, unlockedIds, totalCatalogCount, status, error } = useAppSelector((s) => s.collection);
  const [selected, setSelected] = useState<CollectionArtifact | null>(null);
  const [detailOpen, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [aiExtraFacts, setAiExtraFacts] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedInitialCountryCode = normalizeCountryCode(initialCountryCode);
  const [countryFilter, setCountryFilter] = useState<string>(normalizedInitialCountryCode ?? "ALL");
  /** Play/pause control only after a successful "Get Ranger intel" for this artifact. */
  const [intelAudioUnlocked, setIntelAudioUnlocked] = useState(false);

  useEffect(() => {
    setCountryFilter(normalizedInitialCountryCode ?? "ALL");
  }, [normalizedInitialCountryCode]);

  useEffect(() => {
    setTtsAvailable(typeof window !== "undefined" && !!window.speechSynthesis);
  }, []);

  const stopSpeech = useCallback(() => {
    cancelIntelSpeech();
    setSpeechStatus("idle");
  }, []);

  const playIntelSpeech = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const cleaned = formatIntelForSpeech(text);
    if (!cleaned) return;
    window.speechSynthesis.cancel();
    setSpeechStatus("playing");
    const utterance = new SpeechSynthesisUtterance(cleaned);
    applyNarratorProfile(utterance);
    utterance.onend = () => setSpeechStatus("idle");
    utterance.onerror = () => setSpeechStatus("idle");
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void dispatch(fetchUserCollection(user.id));
  }, [dispatch, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void dispatch(fetchProfileByUserId(user.id));
  }, [dispatch, user?.id]);

  useEffect(() => {
    setAiExtraFacts("");
    setAiError(null);
    setAiLoading(false);
    setIntelAudioUnlocked(false);
    stopSpeech();
  }, [selected?.id, stopSpeech]);

  useEffect(() => () => cancelIntelSpeech(), []);

  const unlockedSet = new Set(unlockedIds);
  const collected = unlockedSet.size;
  const orderedItems = useMemo(() => {
    const unlocked = new Set(unlockedIds);
    return [...items].sort((a, b) => {
      const au = unlocked.has(a.id);
      const bu = unlocked.has(b.id);
      if (au !== bu) return au ? -1 : 1; // unlocked first
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  }, [items, unlockedIds]);

  const countryOptions = useMemo(() => {
    const uniqueCodes = new Set<string>();
    for (const item of items) {
      const code = normalizeCountryCode(item.countryCode);
      if (code) uniqueCodes.add(code);
    }

    return [
      { value: "ALL", label: "All countries" },
      ...Array.from(uniqueCodes)
        .sort((a, b) => countryCodeToName(a).localeCompare(countryCodeToName(b), undefined, { sensitivity: "base" }))
        .map((code) => ({
          value: code,
          label: `${countryCodeToName(code)} (${code})`,
          code,
        })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedItems.filter((artifact) => {
      const code = normalizeCountryCode(artifact.countryCode);
      if (countryFilter !== "ALL" && code !== countryFilter) {
        return false;
      }

      if (!query) return true;

      const countryName = code ? countryCodeToName(code).toLowerCase() : "";
      const title = artifact.title.toLowerCase();
      const codeText = (code ?? "").toLowerCase();
      return (
        title.includes(query) ||
        countryName.includes(query) ||
        codeText.includes(query)
      );
    });
  }, [countryFilter, orderedItems, search]);

  const openArtifact = (artifact: CollectionArtifact) => {
    setSelected(artifact);
    openDetail();
  };

  const closeArtifactModal = () => {
    stopSpeech();
    closeDetail();
    setSelected(null);
  };

  const onSpeechPlaybackClick = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speechStatus === "playing") {
      window.speechSynthesis.pause();
      setSpeechStatus("paused");
      return;
    }
    if (speechStatus === "paused") {
      window.speechSynthesis.resume();
      setSpeechStatus("playing");
      return;
    }
    if (aiExtraFacts.trim()) {
      playIntelSpeech(aiExtraFacts);
    }
  };

  const fetchRangerIntel = async () => {
    if (!selected || intelAudioUnlocked) return;
    stopSpeech();
    setAiLoading(true);
    setAiError(null);
    try {
      const dossierParts = [selected.facts?.trim(), aiExtraFacts.trim()].filter(Boolean);
      const existingFactsPayload = dossierParts.length ? dossierParts.join("\n\n---\n\n") : undefined;

      const res = await fetch("/api/artifacts/gemini-facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.title,
          existingFacts: existingFactsPayload,
          readerName: profile?.username?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { extraFacts?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Intel request failed.");
      }
      if (!data.extraFacts?.trim()) {
        throw new Error("Empty intel response.");
      }
      const newChunk = prefixIntelGreeting(profile?.username, data.extraFacts!);
      setAiExtraFacts((prev) =>
        prev.trim() ? `${prev.trim()}\n\n---\n\n${newChunk}` : newChunk,
      );
      setIntelAudioUnlocked(true);
      playIntelSpeech(newChunk);
      notifications.show({
        color: "teal",
        title: "Intel received",
        message: "Resistance brief updated — narrator audio playing.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not fetch intel.";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
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

      <Stack gap="xs">
        <TextInput
          label="Search"
          placeholder="Search artifact, country name, or code..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <Select
          label="Country"
          data={countryOptions}
          value={countryFilter}
          onChange={(value) => setCountryFilter(value ?? "ALL")}
          allowDeselect={false}
          searchable
          renderOption={({ option }) => {
            const code = (option as unknown as { code?: string }).code;
            const flagUrl = code ? countryCodeToFlagUrl(code) : null;
            return (
              <Group gap="xs" wrap="nowrap">
                {flagUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrl}
                    alt=""
                    width={16}
                    height={12}
                    style={{ borderRadius: 3, border: "1px solid var(--mantine-color-gray-4)" }}
                    loading="lazy"
                  />
                ) : null}
                <Text size="sm">{option.label}</Text>
              </Group>
            );
          }}
        />
      </Stack>

      {status !== "loading" && !error ? (
        <Text size="sm" c="dimmed">
          Showing {filteredItems.length} of {orderedItems.length} artifacts
        </Text>
      ) : null}

      {status !== "loading" && !error && orderedItems.length > 0 && filteredItems.length === 0 ? (
        <Text c="dimmed">No artifacts match your current filters.</Text>
      ) : null}

      <Grid gap={{ base: "sm", md: "md" }} align="stretch" justify="flex-start">
        {filteredItems.map((artifact) => {
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
        title={selected?.title ?? "Artifact"}
        size="lg"
        radius={0}
        centered
        overlayProps={{ backgroundOpacity: 0.55 }}
      >
        {selected ? (
          <Stack gap="md">
            {selected.year || selected.countryCode || selected.countryName ? (
              <Group gap="xs" c="dimmed" fz="sm" wrap="wrap">
                {selected.year ? <Text span>{selected.year}</Text> : null}
                {selected.year && (selected.countryCode || selected.countryName) ? (
                  <Text span c="dimmed">
                    ·
                  </Text>
                ) : null}
                {(() => {
                  const flagUrl = countryCodeToFlagUrl(selected.countryCode);
                  const label =
                    selected.countryName?.trim() ||
                    (selected.countryCode ? countryCodeToName(selected.countryCode) : null) ||
                    selected.countryCode;
                  if (!flagUrl && !label) return null;
                  return (
                    <Group gap={6} wrap="nowrap">
                      {flagUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={flagUrl}
                          alt={label ? `${label} flag` : "Country flag"}
                          title={label ?? undefined}
                          className={styles.countryFlag}
                          loading="lazy"
                        />
                      ) : null}
                      {label ? <Text span>{label}</Text> : null}
                    </Group>
                  );
                })()}
              </Group>
            ) : null}
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
            {selected.facts?.trim() ? (
              <IntelPanel label={<DossierPanelHeading artifact={selected} />}>
                <IntelBody text={selected.facts} variant="dossier" />
              </IntelPanel>
            ) : (
              <Text c="dimmed" size="sm">
                No story or facts added for this artifact yet.
              </Text>
            )}
            {aiError ? (
              <Alert color="red" title="Intel channel down" radius={0}>
                {aiError}
              </Alert>
            ) : null}
            {aiExtraFacts.trim() ? (
              <IntelPanel label="Ranger intel">
                <IntelBody text={aiExtraFacts} variant="intel" />
              </IntelPanel>
            ) : null}
            <Group justify="flex-end" align="center" w="100%" mt="xs" wrap="wrap" gap="sm">
              {intelAudioUnlocked && ttsAvailable && aiExtraFacts.trim() && speechStatus === "playing" ? (
                <SpeakingHeadIcon className={styles.speakingIcon} />
              ) : null}
              {intelAudioUnlocked && ttsAvailable && aiExtraFacts.trim() ? (
                <ActionIcon
                  variant="outline"
                  color="mistral"
                  radius={0}
                  size="lg"
                  aria-label={
                    speechStatus === "playing"
                      ? "Pause briefing audio"
                      : speechStatus === "paused"
                        ? "Resume briefing audio"
                        : "Play briefing audio"
                  }
                  aria-pressed={speechStatus === "playing"}
                  disabled={aiLoading}
                  onClick={onSpeechPlaybackClick}
                >
                  {speechStatus === "playing" ? (
                    <IconPlayerPause size={20} stroke={2} />
                  ) : (
                    <IconPlayerPlay size={20} stroke={2} />
                  )}
                </ActionIcon>
              ) : null}
              <Button
                color="mistral"
                variant="outline"
                radius={0}
                loading={aiLoading}
                aria-busy={aiLoading}
                disabled={aiLoading || intelAudioUnlocked}
                title={
                  intelAudioUnlocked
                    ? "Brief already loaded for this artifact."
                    : undefined
                }
                onClick={() => void fetchRangerIntel()}
              >
                Get Ranger intel
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
