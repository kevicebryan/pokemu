"use client";

import { supabase } from "@/lib/supabase/client";
import { useOutOfHeartsModal } from "@/components/sections/dashboard/OutOfHeartsModalContext";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { unlockArtifact, fetchUserCollection } from "@/redux/slices/collectionSlice";
import { fetchProfileByUserId, setHearts } from "@/redux/slices/profileSlice";
import { countryCodeToName } from "@/util/country";
import { MAX_HEARTS } from "@/util/constant";
import { useMediaQuery, useViewportSize } from "@mantine/hooks";
import { Badge, Box, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconClockHour4 } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import FactBubbles from "./FactBubbles";
import MosaicImage from "./MosaicImage";
import OutOfLives from "./OutOfLives";
import { RankCard } from "./RankCard";

interface Artifact {
  id: string;
  name: string;
  era: string | null;
  region: string | null;
  country_code: string | null;
  museum_name: string | null;
  image_url: string;
  description: string;
  fun_facts: string[] | null;
  art_image_url: string | null;
}

type RoundState = "playing" | "correct" | "wrong";

function maskName(name: string): string {
  return name
    .split("")
    .map((char, i) => {
      if (char === " ") return " ";
      const wordStart = name.lastIndexOf(" ", i - 1) + 1;
      return i === wordStart ? char : "_";
    })
    .join("");
}

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function formatTimeUntil(targetMs: number): string {
  const diffMs = Math.max(0, targetMs - Date.now());
  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function persistHearts(userId: string, hearts: number) {
  await supabase?.from("profiles").update({ hearts }).eq("id", userId);
}

async function persistHeartsWithResetAt(userId: string, hearts: number) {
  await supabase
    ?.from("profiles")
    .update({ hearts, last_heart_reset: new Date().toISOString() })
    .eq("id", userId);
}

async function recordAttempt(userId: string, artifactId: string, isCorrect: boolean, timeSpentSeconds: number) {
  await supabase?.from("question_attempts").insert({
    user_id: userId,
    artifact_id: artifactId,
    is_correct: isCorrect,
    time_spent_seconds: Math.round(timeSpentSeconds * 100) / 100,
  });
}

export default function PlaySection() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const hearts = useAppSelector((s) => Math.min(MAX_HEARTS, Math.max(0, s.profile.profile?.hearts ?? MAX_HEARTS)));
  const lastHeartReset = useAppSelector((s) => s.profile.profile?.last_heart_reset ?? null);
  const countryCodeParam = searchParams.get("countryCode")?.trim().toUpperCase() ?? "";
  const countryCodeFilter = /^[A-Z]{2}$/.test(countryCodeParam) ? countryCodeParam : null;

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [round, setRound] = useState<RoundState>("playing");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWrongAnswer, setShowWrongAnswer] = useState(false);
  const [checkBackIn, setCheckBackIn] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);
  const moveToNextRoundRef = useRef<() => Promise<void>>(async () => {});
  const { width, height } = useViewportSize();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const { openOutOfHeartsModal } = useOutOfHeartsModal();

  function playResultAudio(isCorrect: boolean) {
    const audio = isCorrect ? correctAudioRef.current : wrongAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore autoplay/user-gesture blocking errors.
    });
  }

  useEffect(() => {
    correctAudioRef.current = new Audio("/audio/correct.mp3");
    wrongAudioRef.current = new Audio("/audio/wrong.mp3");
  }, []);

  useEffect(() => {
    if (!userId) return;
    void dispatch(fetchProfileByUserId(userId));
  }, [dispatch, userId]);

  function applyHearts(next: number) {
    if (userId) {
      dispatch(setHearts({ hearts: next, userId }));
    } else {
      dispatch(setHearts(next));
    }
    if (!userId) return;
    const spentAHeart = next < hearts;
    const shouldStartTimer = spentAHeart && next < MAX_HEARTS && !lastHeartReset;
    if (shouldStartTimer) {
      void persistHeartsWithResetAt(userId, next);
      return;
    }
    void persistHearts(userId, next);
  }

  async function fetchRound() {
    setLoading(true);
    setRound("playing");
    setInput("");
    setRoundAttempts(0);
    setShowWrongAnswer(false);

    const { data, error } = await supabase!.rpc("get_random_unowned_artifact", {
      p_user_id: userId ?? null,
      p_country_code: countryCodeFilter ?? null,
    });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const nextArtifact = (data as Artifact[] | null)?.[0] ?? null;
    setArtifact(nextArtifact);
    setElapsedSeconds(0);
    setLoading(false);
    if (nextArtifact) setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function moveToNextRound() {
    if (hearts === 0) {
      return;
    }
    if (userId) {
      await dispatch(fetchUserCollection(userId));
    }
    await fetchRound();
  }

  moveToNextRoundRef.current = moveToNextRound;

  function answer() {
    if (!artifact) return;
    const elapsed = elapsedSeconds;
    const isCorrect = input.trim().toLowerCase() === artifact.name.toLowerCase();

    if (isCorrect) {
      playResultAudio(true);
      setCorrect((c) => c + 1);
      applyHearts(Math.min(MAX_HEARTS, hearts + 1));
      setRound("correct");
      setShowConfetti(true);
      dispatch(unlockArtifact(artifact.id));
      if (userId) {
        void supabase
          ?.from("user_collections")
          .insert({
            user_id: userId,
            artifact_id: artifact.id,
            attempts_taken: roundAttempts + 1,
            time_seconds: Math.round(elapsed),
          })
          .then(() => dispatch(fetchUserCollection(userId)));
        void recordAttempt(userId, artifact.id, true, elapsed);
      }
      return;
    }

    setRoundAttempts((a) => a + 1);
    playResultAudio(false);
    const nextHearts = hearts - 1;
    applyHearts(nextHearts);
    setShowWrongAnswer(false);
    setRound("wrong");
    if (userId) {
      void recordAttempt(userId, artifact.id, false, elapsed);
    }
  }

  /** Stable string so effect dependency arrays stay a fixed shape (React Compiler / Fast Refresh). */
  const artifactIdKey = artifact?.id ?? "";

  /** One key per "schedule advance" episode; unchanged when only `hearts` updates mid wrong/correct. */
  const advanceScheduleKey =
    round === "correct" || round === "wrong" ? `${round}:${artifactIdKey}` : "";

  useEffect(() => {
    if (hearts > 0) {
      const id = window.setTimeout(() => {
        void fetchRound();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [countryCodeFilter]);

  useEffect(() => {
    if (!artifact || round !== "playing") return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [artifactIdKey, round]);

  useEffect(() => {
    if (round !== "correct") return;
    const id = window.setTimeout(() => setShowConfetti(false), 2600);
    return () => window.clearTimeout(id);
  }, [round]);

  useEffect(() => {
    if (round !== "correct" && round !== "wrong") return;
    const id = window.setTimeout(() => {
      void moveToNextRoundRef.current();
    }, 5000);
    return () => window.clearTimeout(id);
  }, [advanceScheduleKey]);

  useEffect(() => {
    if (round !== "wrong") return;
    const id = window.setTimeout(() => {
      setShowWrongAnswer(true);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [artifactIdKey, round]);

  useEffect(() => {
    if (hearts !== 0) return;
    const resetBaseMs = lastHeartReset ? new Date(lastHeartReset).getTime() : Date.now();
    const nextResetMs = resetBaseMs + 24 * 60 * 60 * 1000;
    const updateCheckBackIn = () => {
      const remainingMs = nextResetMs - Date.now();
      if (remainingMs <= 0) {
        setCheckBackIn("now");
        return;
      }
      setCheckBackIn(formatTimeUntil(nextResetMs));
    };

    updateCheckBackIn();
    const id = window.setInterval(updateCheckBackIn, 60 * 1000);
    return () => window.clearInterval(id);
  }, [hearts, lastHeartReset]);

  const answered = round !== "playing";
  const visibleFactCount = Math.min((artifact?.fun_facts ?? []).length, Math.floor(elapsedSeconds / 10));

  const timedImageHints = useMemo(() => {
    if (!artifact) return [];
    const hints: string[] = [];
    if (artifact.country_code) {
      const countryName = countryCodeToName(artifact.country_code);
      hints.push(`Country: ${countryFlag(artifact.country_code)} ${countryName}`);
    }
    if (artifact.era) hints.push(`Era: ${artifact.era}`);
    if (artifact.museum_name) hints.push(`Museum: ${artifact.museum_name}`);
    const revealCount = Math.min(hints.length, Math.floor(elapsedSeconds / 10) + 1);
    return hints.slice(0, revealCount);
  }, [artifact, elapsedSeconds]);

  if (hearts === 0) {
    return <OutOfLives checkBackIn={checkBackIn} onGetLivesBack={openOutOfHeartsModal} />;
  }

  return (
    <Box style={{ height: "calc(100dvh - 64px - 32px)", display: "flex", flexDirection: "column", gap: 12 }}>
      {showConfetti ? (
        <Confetti width={width} height={height} recycle={false} numberOfPieces={260} />
      ) : null}
      <Group justify="space-between">
        <Group gap={6} align="center">
          <IconClockHour4 size={20} />
          <Text fw={800} size="xl">
            {elapsedSeconds}s
          </Text>
        </Group>
        <Text fw={700}>Correct: {correct}</Text>
      </Group>

      <Box style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {!answered && !isMobile ? (
          <FactBubbles facts={artifact?.fun_facts ?? []} visibleCount={visibleFactCount} />
        ) : null}

        <Stack style={{ height: "100%", justifyContent: "space-between" }} gap="md" mb={"xl"}>
          <Stack gap="sm" style={{ minHeight: 0 }}>
            <Group gap="xs" wrap="wrap">
              {timedImageHints.map((hint) => (
                <Badge key={hint} size="lg" color="orange" variant="light">
                  {hint}
                </Badge>
              ))}
            </Group>
            <Text
              fw={700}
              size="xl"
              ff="monospace"
              ta="center"
              style={{ letterSpacing: 3 }}
              c={answered ? (round === "correct" ? "green" : "red") : undefined}
            >
              {artifact
                ? answered
                  ? round === "wrong"
                    ? showWrongAnswer
                      ? artifact.name
                      : maskName(artifact.name)
                    : artifact.name
                  : maskName(artifact.name)
                : "—"}
            </Text>
            <Box
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 220,
              }}
            >
              {artifact?.image_url && !answered ? (
                <MosaicImage
                  src={artifact.image_url}
                  elapsedSeconds={elapsedSeconds}
                  style={{ maxWidth: "100%", maxHeight: "40vh", width: "auto", display: "block" }}
                />
              ) : null}
              {artifact?.image_url && answered ? (
                <img
                  src={artifact.image_url}
                  alt="artifact"
                  style={{ maxWidth: "100%", maxHeight: "45vh", width: "auto", objectFit: "contain", display: "block" }}
                />
              ) : null}
            </Box>
          </Stack>

          <Stack gap="sm">
            {isMobile ? (
              <Stack gap="xs">
                <TextInput
                  ref={inputRef}
                  size="md"
                  placeholder="Type the artifact name..."
                  value={input}
                  onChange={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") answer();
                  }}
                  disabled={answered || loading}
                />
                {!answered ? (
                  <Button size="md" onClick={answer} loading={loading} fullWidth>
                    Submit
                  </Button>
                ) : null}
                {!answered && visibleFactCount > 0 ? (
                  <Stack gap={2} mt={4}>
                    {(artifact?.fun_facts ?? []).slice(0, visibleFactCount).map((fact, index) => (
                      <Text key={`${index}-${fact}`} size="xs" c="dimmed" ta="center">
                        {fact}
                      </Text>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            ) : (
              <Group align="flex-end" wrap="nowrap" style={{ width: "100%" }}>
                <Box style={{ flexBasis: "75%", flexGrow: 0, flexShrink: 0 }}>
                  <TextInput
                    ref={inputRef}
                    size="md"
                    placeholder="Type the artifact name..."
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") answer();
                    }}
                    disabled={answered || loading}
                  />
                </Box>
                <Box style={{ flexBasis: "25%", flexGrow: 0, flexShrink: 0 }}>
                  {!answered ? (
                    <Button size="md" onClick={answer} loading={loading} fullWidth>
                      Submit
                    </Button>
                  ) : null}
                </Box>
              </Group>
            )}
            {answered ? (
              <Text fw={700} size="lg" c={round === "correct" ? "green" : "red"} ta="center">
                {round === "correct"
                  ? "Correct! Next artifact in 5 seconds..."
                  : showWrongAnswer
                    ? "Wrong! Next artifact in 2 seconds..."
                    : "Wrong! Revealing answer in 3 seconds..."}
              </Text>
            ) : null}
            {round === "correct" ? <RankCard /> : null}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
