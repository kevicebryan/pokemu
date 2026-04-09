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
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setAuthUser } from "@/redux/slices/authSlice";
import { upsertProfile } from "@/redux/slices/profileSlice";

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
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
    setError("");
    setStatus("");
    setLoading(true);

    if (!supabase) {
      setError(
        "Missing Supabase config. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.",
      );
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const authUser = data.user;
    if (authUser?.id && authUser.email) {
      dispatch(setAuthUser({ id: authUser.id, email: authUser.email }));
      const seedUsername = authUser.email.split("@")[0] ?? "ranger";
      dispatch(
        upsertProfile({
          id: authUser.id,
          username: seedUsername,
        }),
      );
    }

    setStatus("Registration complete. Check your email for verification.");
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
                    Create Ranger
                  </Button>
                </Stack>
              </Box>

              <Text c={error ? "red.4" : undefined}>{error || status}</Text>

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
    </Center>
  );
}
