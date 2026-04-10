"use client";

import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setHearts } from "@/redux/slices/profileSlice";
import { unlockArtifact, fetchUserCollection } from "@/redux/slices/collectionSlice";
import { MAX_HEARTS } from "@/util/constant";
import { Box, Button, Group, Stack, Text, TextInput, Title, Transition } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import FactBubbles from "./FactBubbles";
import MosaicImage from "./MosaicImage";
import ScoreBoard from "./ScoreBoard";
import Timer from "./Timer";

interface Artifact {
    id: string;
    name: string;
    era: string;
    region: string;
    country_code: string;
    museum_name: string;
    image_url: string;
    description: string;
    fun_facts: string[];
    art_image_url: string;
};

function countryFlag(code: string): string {
    return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function maskName(name: string): string {
    return name.split("").map((char, i) => {
        if (char === " ") return " ";
        const wordStart = name.lastIndexOf(" ", i - 1) + 1;
        return i === wordStart ? char : "_";
    }).join("");
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

export default function PlayGame() {
    const dispatch = useAppDispatch();
    const userId = useAppSelector(s => s.auth.user?.id);
    const hearts = useAppSelector(s => Math.min(MAX_HEARTS, Math.max(0, s.profile.profile?.hearts ?? MAX_HEARTS)));
    const lastHeartReset = useAppSelector((s) => s.profile.profile?.last_heart_reset ?? null);

    const [artifact, setArtifact] = useState<Artifact | null>(null);
    const [round, setRound] = useState<"playing" | "correct" | "wrong">("playing");
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [correct, setCorrect] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [score, setScore] = useState(0);
    const [timerKey, setTimerKey] = useState(0);
    const [roundStartTime, setRoundStartTime] = useState(Date.now());
    const [roundAttempts, setRoundAttempts] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [lastPts, setLastPts] = useState(0);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showDeadPage, setShowDeadPage] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    function applyHearts(next: number) {
        dispatch(setHearts(next));
        if (!userId) return;

        const spentAHeart = next < hearts;
        const shouldStartTimer = spentAHeart && next < MAX_HEARTS && !lastHeartReset;
        if (shouldStartTimer) {
            persistHeartsWithResetAt(userId, next);
        } else {
            persistHearts(userId, next);
        }
    }

    async function fetchRound() {
        setLoading(true);
        setRound("playing");
        setInput("");
        setTimerKey(k => k + 1);
        setRoundStartTime(Date.now());
        setRoundAttempts(0);

        // Get artifact IDs the user already collected
        const ownedIds: string[] = [];
        if (userId) {
            const { data: owned } = await supabase!
                .from("user_collections")
                .select("artifact_id")
                .eq("user_id", userId);
            owned?.forEach(r => ownedIds.push(r.artifact_id));
        }

        let query = supabase!
            .from("artifacts")
            .select("id, name, era, region, country_code, museum_name, image_url, description, fun_facts, art_image_url")
            .limit(50);

        // TODO: Read `countryCode` from `/dashboard/play?countryCode=XX` and
        // apply `query = query.eq("country_code", countryCode)` so the random
        // quiz pool is filtered by the selected country.

        if (ownedIds.length > 0) {
            query = query.not("id", "in", `(${ownedIds.join(",")})`);
        }

        const { data, error } = await query;
        if (error) { console.error(error); setLoading(false); return; }

        if (!data || data.length === 0) {
            setArtifact(null);
            setLoading(false);
            return;
        }

        const randomIndex = Math.floor(Math.random() * data.length);
        setArtifact(data[randomIndex]);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }

    function answer() {
        if (!artifact) return;
        const elapsed = (Date.now() - roundStartTime) / 1000;
        const isCorrect = input.trim().toLowerCase() === artifact.name.toLowerCase();
        if (isCorrect) {
            const pts = elapsed <= 5 ? 100 : Math.max(10, Math.round(100 * (60 - elapsed) / 55));
            setScore(s => s + pts);
            setLastPts(pts);
            setCorrect(c => c + 1);
            applyHearts(MAX_HEARTS);
            setRound("correct");
            dispatch(unlockArtifact(artifact.id));
            if (userId) {
                supabase?.from("user_collections").insert({
                    user_id: userId,
                    artifact_id: artifact.id,
                    attempts_taken: roundAttempts + 1,
                    time_seconds: Math.round(elapsed),
                }).then(() => dispatch(fetchUserCollection(userId)));
                recordAttempt(userId, artifact.id, true, elapsed);
            }
        } else {
            setLastPts(0);
            setWrong(w => w + 1);
            setRoundAttempts(a => a + 1);
            applyHearts(hearts - 1);
            setRound("wrong");
            if (userId) recordAttempt(userId, artifact.id, false, elapsed);
        }
    }

    function onTimerExpire() {
        setWrong(w => w + 1);
        applyHearts(hearts - 1);
        if (userId && artifact) recordAttempt(userId, artifact.id, false, 60);
        if (hearts > 1) fetchRound();
    }

    useEffect(() => {
        if (hearts > 0) fetchRound();
    }, []);

    useEffect(() => {
        if (hearts !== 0) return;
        let remaining = 5;
        setCountdown(remaining);
        const id = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(id);
                setCountdown(null);
                applyHearts(MAX_HEARTS);
                setCorrect(0);
                setWrong(0);
                setScore(0);
                setShowDeadPage(false);
                fetchRound();
            } else {
                setCountdown(remaining);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [hearts === 0]);

    if (showDeadPage) {
        return (
            <Box style={{ height: "calc(100dvh - 64px - 32px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <Text size="64px" style={{ lineHeight: 1 }}>💀</Text>
                <Title order={2}>Out of Lives</Title>
                <Text c="dimmed" ta="center">Restoring in <b style={{ color: "white" }}>{countdown}s</b>…</Text>
            </Box>
        );
    }

    const isCorrect = round === "correct";
    const answered = round !== "playing";
    const facts = artifact?.fun_facts ?? [];
    const healthLow = hearts <= 1;
    const revealedFacts: string[] = [];
    if (facts.length > 0 && (healthLow || secondsLeft <= 20)) revealedFacts.push(facts[0]);
    if (facts.length > 1 && secondsLeft <= 10) revealedFacts.push(facts[1]);

    return (
        <Box style={{ height: "calc(100dvh - 64px - 32px)", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Timer bar: full width at top */}
            <Timer key={timerKey} onExpire={onTimerExpire} stopped={answered} onTick={setSecondsLeft} />

            {/* Main row */}
            <Box style={{ flex: 1, minHeight: 0, display: "flex", gap: 24, overflow: "visible" }}>
            {/* Left: image only */}
            <Box style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
                {artifact?.image_url && (
                    !answered
                        ? <MosaicImage src={artifact.image_url} size={32} style={{ maxWidth: "100%", maxHeight: "100%", display: "block", transition: "opacity 0.4s ease" }} />
                        : <img src={artifact.image_url} alt="artifact" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", transition: "opacity 0.4s ease", animation: "fadeIn 0.4s ease" }} />
                )}
                {!answered && <FactBubbles facts={revealedFacts} />}
            </Box>

            {/* Right: controls */}
            <Stack gap={0} style={{ width: 360, flexShrink: 0, height: "100%", paddingTop: "15%" }}>

                {/* Fixed content: score + name + input */}
                <Stack gap="lg" align="center">
                    <ScoreBoard correct={correct} wrong={wrong} score={score} />
                    <Stack gap="sm" style={{ width: "100%" }}>
                        <Text fw={700} size="xl" ff="monospace" ta="center" style={{ letterSpacing: 3, transition: "color 0.3s ease" }} c={answered ? (isCorrect ? "green" : "red") : undefined}>
                            {artifact ? (answered ? artifact.name : maskName(artifact.name)) : "—"}
                        </Text>
                        <Group align="flex-end">
                            <TextInput
                                ref={inputRef}
                                style={{ flex: 1 }}
                                size="md"
                                placeholder="Type the artifact name..."
                                value={input}
                                onChange={e => setInput(e.currentTarget.value)}
                                onKeyDown={e => { if (e.key === "Enter") answer(); }}
                                disabled={answered || loading}
                            />
                            {answered
                                ? <Button size="md" onClick={() => hearts === 0 ? setShowDeadPage(true) : fetchRound()}>Next</Button>
                                : <Button size="md" onClick={answer} loading={loading}>Submit</Button>
                            }
                        </Group>
                    </Stack>
                </Stack>

                {/* Info slides in below input without shifting anything above */}
                <Transition mounted={answered} transition="slide-up" duration={300} timingFunction="ease">
                    {styles => (
                        <Stack gap="xs" mt={10} mb={8} align="center" style={styles}>
                            <Group gap="xs" align="center">
                                <Text fw={700} size="lg" c={isCorrect ? "green" : "red"}>
                                    {isCorrect ? "✅ Correct!" : "❌ Wrong!"}
                                </Text>
                                {isCorrect && <Text fw={600} size="lg" c="yellow">+{lastPts} pts</Text>}
                            </Group>
                            {hearts === 0 && countdown !== null && (
                                <Text size="sm" c="dimmed">💀 Restoring lives in <b style={{ color: "white" }}>{countdown}s</b>…</Text>
                            )}
                            <Text size="lg" ta="center"><b>Era:</b> {artifact?.era ?? "—"}</Text>
                            <Text size="lg" ta="center"><b>Region:</b> {artifact?.region ?? "—"}</Text>
                            <Text size="lg" ta="center"><b>Country:</b> {artifact?.country_code ? `${countryFlag(artifact.country_code)} ${artifact.country_code}` : "—"}</Text>
                            <Text size="lg" ta="center"><b>Museum:</b> {artifact?.museum_name ?? "—"}</Text>
                        </Stack>
                    )}
                </Transition>
            </Stack>
            </Box>
        </Box>
    );
}
