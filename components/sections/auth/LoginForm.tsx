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
import { fetchProfileByUserId } from "@/redux/slices/profileSlice";

export function LoginForm() {
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

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      notifications.show({
        color: "red",
        title: "Login failed",
        message: authError.message,
      });
      setLoading(false);
      return;
    }

    const authUser = data.user;
    if (authUser && !authUser.email_confirmed_at) {
      await supabase.auth.signOut();
      notifications.show({
        color: "yellow",
        title: "Email not confirmed",
        message: "Please confirm your email before logging in.",
      });
      setLoading(false);
      return;
    }

    if (authUser?.id && authUser.email) {
      dispatch(setAuthUser({ id: authUser.id, email: authUser.email }));
      dispatch(fetchProfileByUserId(authUser.id));
    }

    notifications.show({
      color: "teal",
      title: "Welcome back",
      message: "Login successful.",
    });
    router.replace("/dashboard/profile");
    setLoading(false);
  };

  return (
    <Center component="section" mih="100vh" p={24}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Container size={460} p={0}>
          <Card>
            <Stack gap="sm">
              <Title order={1}>Pokemu Login</Title>
              <Text c="dimmed">Restore culture. Rebuild memory.</Text>

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
                    autoComplete="current-password"
                  />
                  <Button type="submit" color="orange" loading={loading}>
                    Enter World
                  </Button>
                </Stack>
              </Box>

              <Text size="sm">
                New trainer?{" "}
                <Anchor component={Link} href="/register">
                  Create account
                </Anchor>
              </Text>
            </Stack>
          </Card>
        </Container>
      </motion.div>
    </Center>
  );
}
