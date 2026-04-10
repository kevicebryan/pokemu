"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Center,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useAppSelector } from "@/redux/hooks";
import { SKY_BG } from "@/lib/theme";
import Image from "next/image";
import DialogueOverlay from "@/components/sections/onboarding/DialogueOverlay";
import {
  HOME_BACKSTORY_LINES,
  HOME_BGM_SRC,
  POKEMU_BACKSTORY_SHOWN_KEY,
} from "@/util/constant";

function startHomeBackgroundMusic(el: HTMLAudioElement) {
  el.loop = true;
  if (!el.paused) return;
  el.muted = true;
  void el
    .play()
    .then(() => {
      el.muted = false;
    })
    .catch(() => {
      el.muted = false;
      void el.play().catch(() => {});
    });
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);
  const [showBackstory, setShowBackstory] = useState(false);
  const homeMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace("/dashboard/profile");
    }
  }, [initialized, isAuthenticated, router]);

  useEffect(() => {
    if (!initialized || isAuthenticated || typeof window === "undefined") return;
    const done = localStorage.getItem(POKEMU_BACKSTORY_SHOWN_KEY) === "true";
    if (done) return;
    const id = requestAnimationFrame(() => setShowBackstory(true));
    return () => cancelAnimationFrame(id);
  }, [initialized, isAuthenticated]);

  useEffect(() => {
    if (!initialized) return;
    const el = homeMusicRef.current;
    if (!el) return;
    if (isAuthenticated) {
      el.pause();
      return;
    }
    if (showBackstory) {
      el.pause();
      return;
    }
    startHomeBackgroundMusic(el);
  }, [initialized, isAuthenticated, showBackstory]);

  useEffect(() => {
    const el = homeMusicRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  const tryResumeMusicFromGesture = useCallback(() => {
    if (showBackstory) return;
    const el = homeMusicRef.current;
    if (el) startHomeBackgroundMusic(el);
  }, [showBackstory]);

  const closeBackstory = () => {
    setShowBackstory(false);
    const el = homeMusicRef.current;
    if (el) startHomeBackgroundMusic(el);
  };

  const completeBackstory = () => {
    localStorage.setItem(POKEMU_BACKSTORY_SHOWN_KEY, "true");
    setShowBackstory(false);
    const el = homeMusicRef.current;
    if (el) startHomeBackgroundMusic(el);
  };

  if (!initialized) {
    return null;
  }

  return (
    <>
      <audio ref={homeMusicRef} src={HOME_BGM_SRC} preload="auto" loop hidden />
      <Center
        component="main"
        mih="100vh"
        p={24}
        bg={SKY_BG}
        pos={"relative"}
        onPointerDownCapture={tryResumeMusicFromGesture}
      >
      <ActionIcon
        pos="absolute"
        top={16}
        left={16}
        variant="outline"
        color="dark"
        size="lg"
        radius={0}
        aria-label="Play backstory"
        onClick={() => setShowBackstory(true)}
        style={{ zIndex: 2 }}
      >
        <IconPlayerPlay size={22} stroke={1.5} />
      </ActionIcon>

      {showBackstory ? (
        <DialogueOverlay
          dialogues={HOME_BACKSTORY_LINES}
          onClose={closeBackstory}
          onStart={completeBackstory}
        />
      ) : null}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1 }}
      >
        <Container size={"xl"} p={0} mt={"-10vh"}>
          <Card bd={"1px solid black"} maw={400}>
            <Stack gap="sm" align="center">
              <Title
                order={1}
              >
                Pokemu
              </Title>
              <Text ta={"center"}>Help restore Earth&apos;s scattered cultural archives.</Text>
              <Group gap={10} wrap="wrap">
                <Button component={Link} href="/login" >
                  Login
                </Button>
                <Button component={Link} href="/register" variant="outline">
                  Register
                </Button>
              </Group>
            </Stack>
          </Card>
        </Container>
      </motion.div>
      <Stack
        gap={0}
        pos="absolute"
        bottom={0}
        left={0}
        right={0}
        w="100%"
        style={{ zIndex: 0 }}
      >
        <Image
          src={"/images/doom_gpt.png"}
          alt="DoomGPT"
          width={320}
          height={320}
          style={{
            height: 320,
            width: "auto",
            objectFit: "contain",
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
          }}
        />
        <Box h={40} w="100%" bg="mistral.2" style={{ zIndex: 1 }} />
        <Box h={40} w="100%" bg="mistral.4" style={{ zIndex: 1 }} />
        <Box h={40} w="100%" bg="mistral.6" style={{ zIndex: 1 }} />
        <Box h={40} w="100%" bg="mistral.8" style={{ zIndex: 3 }} />
      </Stack>
    </Center>
    </>
  );
}
