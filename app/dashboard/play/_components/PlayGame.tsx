"use client";

import { supabase } from "@/lib/supabase/client";
import { Box, Button, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import FactBubbles from "./FactBubbles";
import MosaicImage from "./MosaicImage";
import ScoreBoard from "./ScoreBoard";
import Timer from "./Timer";

type Artifact = {
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

type RoundState = "playing" | "correct" | "wrong";

// Show first letter of each word, blank the rest: "Terracotta Army" → "T_________ A___"
function maskName(name: string): string {
    return name.split("").map((char, i) => {
        if (char === " ") return " ";
        const wordStart = name.lastIndexOf(" ", i - 1) + 1;
        return i === wordStart ? char : "_";
    }).join("");
}

export default function PlayGame() {
    const [artifact, setArtifact] = useState<Artifact | null>(null);
    const [round, setRound] = useState<RoundState>("playing");
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [correct, setCorrect] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [score, setScore] = useState(0);
    const [timerKey, setTimerKey] = useState(0);
    const [roundStartTime, setRoundStartTime] = useState(Date.now());
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [lastPts, setLastPts] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    async function fetchRound() {
        setLoading(true);
        setRound("playing");
        setInput("");
        setTimerKey(k => k + 1);
        setRoundStartTime(Date.now());

        const { data, error } = await supabase!.rpc("get_random_artifact");
        if (error) { console.error(error); setLoading(false); return; }

        setArtifact(data?.[0] ?? null);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }

    function answer() {
        if (!artifact) return;
        const isCorrect = input.trim().toLowerCase() === artifact.name.toLowerCase();
        if (isCorrect) {
            const elapsed = (Date.now() - roundStartTime) / 1000;
            const pts = elapsed <= 5 ? 100 : Math.max(0, Math.round(100 * (60 - elapsed) / 55));
            setScore(s => s + pts);
            setLastPts(pts);
            setCorrect(c => c + 1);
            setRound("correct");
        } else {
            setLastPts(0);
            setWrong(w => w + 1);
            setRound("wrong");
        }
    }

    function onTimerExpire() {
        setWrong(w => w + 1);
        fetchRound();
    }

    useEffect(() => { fetchRound(); }, []);

    const isCorrect = round === "correct";
    const answered = round !== "playing";
    const facts = artifact?.fun_facts ?? [];
    const elapsed = 60 - secondsLeft;
    const revealedFacts = facts.slice(0, Math.floor(elapsed / 15));

    return (
        <Box style={{ height: "calc(100dvh - 64px - 32px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Top bar */}
            <Group justify="space-between" align="center" mb="xs">
                <Group align="center" gap="xl">
                    <Title order={2}>Play</Title>
                    <ScoreBoard correct={correct} wrong={wrong} score={score} />
                    {answered && (
                        <Group gap="xs" align="center">
                            <Text fw={700} c={isCorrect ? "green" : "red"}>
                                {isCorrect ? "✅ Correct!" : "❌ Wrong!"}
                            </Text>
                            <Text size="sm" c="dimmed">— {artifact?.name}</Text>
                            {isCorrect && <Text fw={600} c="yellow">+{lastPts} pts</Text>}
                        </Group>
                    )}
                </Group>
                <Timer key={timerKey} onExpire={onTimerExpire} stopped={answered} onTick={setSecondsLeft} />
            </Group>

            {/* Image fills remaining space */}
            <Box style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }} my="xs">
                {artifact?.image_url && (
                    !answered
                        ? <MosaicImage src={artifact.image_url} size={32} style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
                        : <img src={artifact.image_url} alt="artifact" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                )}
                {!answered && <FactBubbles facts={revealedFacts} />}
            </Box>

            {/* Bottom controls */}
            <Stack gap="xs" style={{ flexShrink: 0 }}>
                {round !== "playing" ? <Group gap="xl">
                    <Text size="sm"><b>Era:</b> {artifact?.era ?? "—"}</Text>
                    <Text size="sm"><b>Region:</b> {artifact?.region ?? "—"}</Text>
                    <Text size="sm"><b>Country:</b> {artifact?.country_code ?? "—"}</Text>
                    <Text size="sm"><b>Museum:</b> {artifact?.museum_name ?? "—"}</Text>
                </Group> : null}

<Text fw={700} size="lg" ff="monospace" ta="center" style={{ letterSpacing: 2 }} c={answered ? (isCorrect ? "green" : "red") : undefined}>
                    {artifact ? (answered ? artifact.name : maskName(artifact.name)) : "—"}
                </Text>

                <Group align="flex-end">
                    <TextInput
                        ref={inputRef}
                        style={{ flex: 1 }}
                        placeholder="Type the artifact name..."
                        value={input}
                        onChange={e => setInput(e.currentTarget.value)}
                        onKeyDown={e => { if (e.key === "Enter") answer(); }}
                        disabled={answered || loading}
                    />
                    {answered
                        ? <Button onClick={fetchRound}>Next</Button>
                        : <Button onClick={answer} loading={loading}>Submit</Button>
                    }
                </Group>
            </Stack>
        </Box>
    );
}
