"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Center,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconX } from "@tabler/icons-react";

const TYPING_AUDIO_SRC = "/audio/typing.mp3";
const CLICK_AUDIO_SRC = "/audio/click.mp3";
const MS_PER_CHAR = 34;

/** Browsers block unmuted autoplay; muted play is often allowed, then we unmute. */
function tryPlayTypingLoop(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  audio.muted = true;
  void audio
    .play()
    .then(() => {
      audio.muted = false;
    })
    .catch(() => {
      audio.muted = false;
      void audio.play().catch(() => { });
    });
}

export type DialogueOverlayProps = {
  dialogues: string[];
  onClose: () => void;
  /** Called when the user taps Start on the final step. Defaults to `onClose` if omitted. */
  onStart?: () => void;
};

const dialogueKey = (lines: string[]) => lines.join("\u0001");

type TypingLineProps = {
  line: string;
  typingAudioRef: RefObject<HTMLAudioElement | null>;
};

const TypingLine = ({ line, typingAudioRef }: TypingLineProps) => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const text = line;
    const audio = typingAudioRef.current;

    if (text.length === 0) {
      audio?.pause();
      return;
    }

    let count = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      audio?.pause();
    };

    const tick = () => {
      count += 1;
      setVisibleCount(count);
      if (count >= text.length) {
        finish();
        return;
      }
      timeoutId = setTimeout(tick, MS_PER_CHAR);
    };

    if (audio) {
      tryPlayTypingLoop(audio);
    }
    tick();

    return () => {
      finish();
    };
  }, [line, typingAudioRef]);

  const shown = line.slice(0, visibleCount);

  return (
    <Text size="md" ta="center" style={{ minHeight: "1.5em" }}>
      {shown}
      {visibleCount < line.length ? (
        <Box component="span" ml={4} display="inline" aria-hidden>
          ▌
        </Box>
      ) : null}
    </Text>
  );
};

const DialogueOverlay = ({ dialogues, onClose, onStart }: DialogueOverlayProps) => {
  const [step, setStep] = useState(0);
  const [seenKey, setSeenKey] = useState(() => dialogueKey(dialogues));
  const nextKey = dialogueKey(dialogues);
  if (nextKey !== seenKey) {
    setSeenKey(nextKey);
    setStep(0);
  }

  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickPrimedRef = useRef(false);

  /** Browsers require a user gesture for audio; capture runs before button clicks. */
  const gestureUnlockAudio = useCallback((e?: ReactPointerEvent | ReactKeyboardEvent) => {
    if (e && "repeat" in e && e.repeat) return;
    void typingAudioRef.current?.play().catch(() => { });
    if (clickPrimedRef.current) return;
    clickPrimedRef.current = true;
    const click = clickAudioRef.current;
    if (!click) return;
    click.muted = true;
    void click
      .play()
      .then(() => {
        click.pause();
        click.currentTime = 0;
        click.muted = false;
      })
      .catch(() => {
        click.muted = false;
      });
  }, []);

  const lastIndex = dialogues.length > 0 ? dialogues.length - 1 : 0;
  const safeStep = dialogues.length === 0 ? 0 : Math.min(step, lastIndex);
  const line = dialogues.length === 0 ? "" : dialogues[safeStep];
  const isLast = dialogues.length > 0 && safeStep === lastIndex;

  const playClick = () => {
    const a = clickAudioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => { });
  };

  const handlePrimary = () => {
    playClick();
    if (dialogues.length === 0) return;
    if (isLast) {
      (onStart ?? onClose)();
      return;
    }
    setStep((s) => Math.min(s + 1, lastIndex));
  };

  const handleBack = () => {
    playClick();
    setStep((s) => Math.max(0, s - 1));
  };

  if (dialogues.length === 0) {
    return null;
  }

  return (
    <>
      <audio ref={typingAudioRef} src={TYPING_AUDIO_SRC} loop preload="auto" hidden />
      <audio ref={clickAudioRef} src={CLICK_AUDIO_SRC} preload="auto" hidden />
      <Box
        pos="fixed"
        inset={0}
        bg="black"
        style={{ zIndex: 1000 }}
        onPointerDownCapture={gestureUnlockAudio}
        onKeyDownCapture={gestureUnlockAudio}
      >
        <Center h="100%" p="md">
          <Stack>
            <Card
              pos="relative"
              maw={480}
              w="100%"
              bd="1px solid black"
              p="lg"
              pt="xl"
            >
              <ActionIcon
                pos="absolute"
                top={8}
                right={8}
                variant="subtle"
                color="gray"
                aria-label="Close"
                onClick={onClose}
              >
                <IconX size={20} stroke={1.5} />
              </ActionIcon>

              <Stack gap="lg">
                <TypingLine key={safeStep} line={line} typingAudioRef={typingAudioRef} />

              </Stack>
            </Card>

            <Group justify={safeStep > 0 ? "space-between" : "flex-end"} wrap="nowrap" gap="sm">
              {safeStep > 0 ? (
                <Button variant="outline" onClick={handleBack} leftSection={<IconArrowLeft size={16} />}>
                  Back
                </Button>
              ) : null}
              <Button onClick={handlePrimary} rightSection={<IconArrowRight size={16} />}>{isLast ? "Start" : "Continue"}</Button>
            </Group>
          </Stack>
        </Center>
      </Box>
    </>
  );
};

export default DialogueOverlay;
