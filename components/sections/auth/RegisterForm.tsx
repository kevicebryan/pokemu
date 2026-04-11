"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setAuthUser } from "@/redux/slices/authSlice";
import { upsertProfile } from "@/redux/slices/profileSlice";
import Image from "next/image";

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace("/dashboard/profile");
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return null;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (!supabase) {
      notifications.show({
        color: "red",
        title: "Supabase config missing",
        message:
          "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.",
      });
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      notifications.show({
        color: "red",
        title: "Registration failed",
        message: authError.message,
      });
      setLoading(false);
      return;
    }

    const authUser = data.user;

    // Enforce confirmation-first flow for all newly registered users.
    if (!authUser?.email_confirmed_at) {
      await supabase.auth.signOut();
      notifications.show({
        color: "teal",
        title: "Check your email",
        message: "Registration successful. Confirm your email before logging in.",
      });
      setEmail("");
      setPassword("");
      setLoading(false);
      router.replace("/login");
      return;
    }

    if (authUser.id && authUser.email) {
      dispatch(setAuthUser({ id: authUser.id, email: authUser.email }));
      const seedUsername = authUser.email.split("@")[0] ?? "trainer";
      dispatch(
        upsertProfile({
          id: authUser.id,
          username: seedUsername,
        }),
      );
    }

    notifications.show({
      color: "teal",
      title: "Account ready",
      message: "Registration complete.",
    });
    router.replace("/dashboard/profile");
    setLoading(false);
  };

  return (
    <Center bg={"mistral.6"} component="section" mih="100vh" p={24} pos={"relative"} style={{ overflow: "hidden" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        <Container size={460} p={0}>
          <Card>
            <Stack gap="sm">
              <Title order={1}>Pokemu Register</Title>
              <Text c="dimmed">Your restoration journey starts here.</Text>

              <Box component="form" onSubmit={onSubmit}>
                <Stack gap="sm">
                  <TextInput
                    required
                    label="Email"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    autoComplete="email"
                  />
                  <PasswordInput
                    required
                    label="Password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    autoComplete="new-password"
                  />
                  <Button type="submit" color="orange" loading={loading}>
                    Create Trainer
                  </Button>
                </Stack>
              </Box>

              <Text size="sm">
                Already have an account?{" "}
                <Anchor component={Link} href="/login">
                  Login
                </Anchor>
              </Text>
            </Stack>
          </Card>
        </Container>
      </motion.div>
      <Image src={"/images/app_bg.png"} alt="app_bg" width={1024} height={1024}
        style={{
          position: "absolute",
          bottom: "-20vh",
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />
    </Center>
  );
}
