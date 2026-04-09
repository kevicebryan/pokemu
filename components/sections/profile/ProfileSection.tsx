"use client";

import { Box, Card, Container, Stack, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import { ProfileForm } from "./ProfileForm";
import styles from "./ProfileSection.module.css";

export function ProfileSection() {
  return (
    <Box component="section" className={styles.screen}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Container size={560} p={0}>
          <Card className={styles.panel}>
            <Stack gap="sm">
              <Title order={1} className={styles.title}>
                Ranger Profile
              </Title>
              <Text className={styles.copy}>Manage your Pokemu identity and progress stats.</Text>
              <ProfileForm />
            </Stack>
          </Card>
        </Container>
      </motion.div>
    </Box>
  );
}
