"use client";

import { useEffect, useState } from "react";
import { Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchUserCollection } from "@/redux/slices/collectionSlice";
import {
  fetchOtherRoomOwners,
  type OtherRoomOwner,
} from "@/lib/roomDecorations";
import RoomBox from "./RoomBox";
import RoomCard from "./RoomCard";

const RoomSection = () => {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [others, setOthers] = useState<OtherRoomOwner[]>([]);
  const [othersLoading, setOthersLoading] = useState(true);
  const [othersError, setOthersError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      void dispatch(fetchUserCollection(user.id));
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOthersLoading(true);
      setOthersError(null);
      const { data, error } = await fetchOtherRoomOwners(user?.id ?? null);
      if (cancelled) return;
      if (error) {
        setOthersError(error);
        setOthers([]);
      } else {
        setOthers(data);
      }
      setOthersLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Title order={2}>Room</Title>
        <Text>
          Show off and decorate your room with artifacts you&apos;ve collected.
        </Text>
      </Stack>
      {user?.id ? (
        <RoomBox key={user.id} roomOwnerUserId={user.id} />
      ) : (
        <Text c="dimmed" size="sm">
          Sign in to view and decorate your room.
        </Text>
      )}

      <Stack gap="sm">
        <Title order={3} size="h4">
          Other rangers&apos; rooms
        </Title>
        {othersLoading ? (
          <Loader color="mistral" size="sm" />
        ) : othersError ? (
          <Text size="sm" c="red">
            {othersError}
          </Text>
        ) : others.length === 0 ? (
          <Text size="sm" c="dimmed">
            No other decorated rooms yet.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
            {others.map((owner) => (
              <RoomCard key={owner.userId} owner={owner} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
};

export default RoomSection;