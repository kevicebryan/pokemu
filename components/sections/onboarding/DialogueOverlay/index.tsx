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
  Flex,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconArrowLeft, IconArrowRight, IconX } from "@tabler/icons-react";
import type { HomeBackstoryLine } from "@/util/constant";

const TYPING_AUDIO_SRC = "/audio/typing.mp3";
const CLICK_AUDIO_SRC = "/audio/click.mp3";
const MS_PER_CHAR = 34;

/** Starts tiny (chunky pixels) and resolves to full size; pairs with `image-rendering: pixelated` on the img. */
const PIXEL_DISSOLVE = {
  enter: { opacity: 1, scale: 1, filter: "blur(0px)" },
  initial: { opacity: 0, scale: 0.07, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.05, filter: "blur(6px)" },
  transition: {
    opacity: { duration: 0.32 },
    scale: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
    filter: { duration: 0.28 },
  },
} as const;

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
  dialogues: HomeBackstoryLine[];
  onClose: () => void;
  /** Called when the user taps Start on the final step. Defaults to `onClose` if omitted. */
  onStart?: () => void;
};

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
    <Text size="md" ta="center" c="black" style={{ minHeight: "1.5em" }}>
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

  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickPrimedRef = useRef(false);
  const isNarrow = useMediaQuery("(max-width: 48em)");
  const reduceMotion = useReducedMotion();

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
  const current = dialogues.length === 0 ? null : dialogues[safeStep];
  const line = current?.text ?? "";
  const imageUrl = current?.imageUrl?.trim() || undefined;
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

  const imageMotion = reduceMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    }
    : {
      initial: PIXEL_DISSOLVE.initial,
      animate: PIXEL_DISSOLVE.enter,
      exit: PIXEL_DISSOLVE.exit,
      transition: PIXEL_DISSOLVE.transition,
    };

  /** Desktop: left column. Mobile: absolute full-bleed cover behind dialogue (out of flex flow). */
  const storyImageLayer =
    imageUrl != null ? (
      <Box
        pos={{ base: "absolute", sm: "relative" }}
        top={0}
        left={0}
        right={0}
        bottom={0}
        flex={{ base: undefined, sm: "0 0 auto" }}
        miw={0}
        w={{ base: "100%", sm: "clamp(280px, 38vw, 520px)" }}
        mih={{ base: "100%", sm: 0 }}
        h={{ base: "100%", sm: "100%" }}
        bg="mistral.6"
        style={{
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={imageUrl}
            initial={imageMotion.initial}
            animate={imageMotion.animate}
            exit={imageMotion.exit}
            transition={imageMotion.transition}
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "center center",
              willChange: reduceMotion ? "opacity" : "transform, opacity, filter",
            }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                imageRendering: "pixelated",
              }}
            />
          </motion.div>
        </AnimatePresence>
      </Box>
    ) : null;

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
        <Card
          pos="relative"
          w="100%"
          maw="100%"
          mih={{ base: "100dvh", sm: "100vh" }}
          h={{ base: "100dvh", sm: "100vh" }}
          bd="1px solid black"
          p={0}
          style={{ overflow: "hidden", borderRadius: 0 }}
        >
          <ActionIcon
            pos="absolute"
            top={8}
            right={8}
            variant="subtle"
            color="gray"
            aria-label="Close"
            onClick={onClose}
            style={{ zIndex: 2 }}
          >
            <IconX size={20} stroke={1.5} />
          </ActionIcon>

          <Flex
            pos="relative"
            direction={{ base: "column", sm: "row" }}
            align={{ base: "stretch", sm: "stretch" }}
            justify={{ base: "center", sm: "flex-start" }}
            wrap="nowrap"
            gap={0}
            mih={{ base: "100dvh", sm: "100vh" }}
            h={{ base: "100%", sm: "100vh" }}
          >
            {storyImageLayer}

            <Flex
              direction="column"
              align="center"
              justify="center"
              flex={1}
              miw={0}
              mih={{ base: "100dvh", sm: 0 }}
              pos="relative"
              style={{ zIndex: 1 }}
              bg={{ base: imageUrl != null ? "transparent" : "black", sm: "black" }}
              px={{ base: "md", sm: "xl" }}
              py={{ base: "lg", sm: "xl" }}
            >
              <Paper
                p="lg"
                pt="xl"
                radius="md"
                w="100%"
                maw={{ base: 480, sm: 520 }}
                mx="auto"
                bg="white"
                bdrs={0}
                bd="4px solid var(--mantine-color-mistral-7)"
                style={{ flex: isNarrow && imageUrl != null ? undefined : 0 }}
              >
                <Stack gap="lg" w="100%">
                  <TypingLine key={safeStep} line={line} typingAudioRef={typingAudioRef} />

                  <Group justify={safeStep > 0 ? "space-between" : "flex-end"} wrap="nowrap" gap="sm">
                    {safeStep > 0 ? (
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        leftSection={<IconArrowLeft size={16} />}
                      >
                        Back
                      </Button>
                    ) : null}
                    <Button
                      onClick={handlePrimary}
                      rightSection={<IconArrowRight size={16} />}
                    >
                      {isLast ? "Start" : "Continue"}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Flex>
          </Flex>
        </Card>

        <Stack
          gap={0}
          pos="absolute"
          bottom={0}
          left={0}
          right={0}
          w="100%"
          style={{ zIndex: 0 }}
        >
          <Box h={12} w="100%" bg="mistral.2" style={{ zIndex: 1 }} />
          <Box h={12} w="100%" bg="mistral.4" style={{ zIndex: 1 }} />
          <Box h={12} w="100%" bg="mistral.6" style={{ zIndex: 1 }} />
          <Box h={12} w="100%" bg="mistral.8" style={{ zIndex: 3 }} />
        </Stack>
      </Box>
    </>
  );
};

export default DialogueOverlay;
