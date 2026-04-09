"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Center, Container, Group, Stack, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import { useAppSelector } from "@/redux/hooks";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace("/dashboard/profile");
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return null;
  }

  return (
    <Center component="main" mih="100vh" p={24}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Container size={520} p={0}>
          <Card bg="var(--pokemu-panel-hi)">
            <Stack gap="sm">
              <Title
                order={1}
                ff='"Bitcount", "Courier New", monospace'
                tt="uppercase"
                style={{ letterSpacing: "0.08em" }}
              >
                Pokemu
              </Title>
              <Text>8-bit cultural restoration adventure.</Text>
              <Group gap={10} wrap="wrap">
                <Button component={Link} href="/login" color="orange">
                  Login
                </Button>
                <Button component={Link} href="/register" color="orange" variant="outline">
                  Register
                </Button>
              </Group>
            </Stack>
          </Card>
        </Container>
      </motion.div>
    </Center>
  );
}
