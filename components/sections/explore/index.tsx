"use client";

import { supabase } from "@/lib/supabase/client";
import { useAppSelector } from "@/redux/hooks";
import { countryCodeToName } from "@/util/country";
import { Alert, Grid, Loader, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CountryCard, { type CountryCardData } from "./CountryCard";

type ArtifactCountryRow = {
  id: string | number;
  country_code: string | null;
};

type UserCollectionRow = {
  artifact_id: string | number | null;
};

function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

const ExploreSection = () => {
  const router = useRouter();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CountryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setError("Supabase client is not configured.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [{ data: artifactRows, error: artifactsError }, collectionResult] =
        await Promise.all([
          supabase.from("artifacts").select("id, country_code"),
          userId
            ? supabase
              .from("user_collections")
              .select("artifact_id")
              .eq("user_id", userId)
            : Promise.resolve({ data: [] as UserCollectionRow[], error: null }),
        ]);

      if (artifactsError) {
        setError(artifactsError.message);
        setLoading(false);
        return;
      }

      if (collectionResult.error) {
        setError(collectionResult.error.message);
        setLoading(false);
        return;
      }

      const ownedIds = new Set(
        (collectionResult.data ?? [])
          .map((row: UserCollectionRow) => row.artifact_id)
          .filter(
            (id): id is string | number =>
              typeof id === "string" || typeof id === "number",
          )
          .map(String),
      );

      const byCountry = new Map<string, CountryCardData>();
      for (const raw of (artifactRows ?? []) as ArtifactCountryRow[]) {
        const code = normalizeCountryCode(raw.country_code);
        if (!code) continue;

        const existing = byCountry.get(code) ?? {
          countryCode: code,
          countryName: countryCodeToName(code),
          unlockedCount: 0,
          totalCount: 0,
        };

        existing.totalCount += 1;
        if (ownedIds.has(String(raw.id))) {
          existing.unlockedCount += 1;
        }

        byCountry.set(code, existing);
      }

      setItems(
        Array.from(byCountry.values()).sort((a, b) =>
          a.countryName.localeCompare(b.countryName, undefined, { sensitivity: "base" }),
        ),
      );
      setLoading(false);
    };

    void load();
  }, [userId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      return (
        item.countryName.toLowerCase().includes(q) ||
        item.countryCode.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  return (
    <Stack gap="lg">
      <Title order={2}>Explore by Country</Title>

      <TextInput
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="Search country name or code..."
        leftSection={<IconSearch size={16} />}
      />

      {loading ? <Loader mx="auto" my="xl" /> : null}

      {error ? (
        <Alert color="red" title="Could not load countries">
          {error}
        </Alert>
      ) : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <Text c="dimmed">
          {items.length === 0
            ? "No country data found in artifacts yet."
            : "No countries match your search."}
        </Text>
      ) : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <Grid>
          {filteredItems.map((item) => (
            <Grid.Col key={item.countryCode} span={{ base: 12, sm: 6, md: 4 }}>
              <CountryCard
                item={item}
                onPlay={(countryCode) =>
                  router.push(
                    `/dashboard/play?countryCode=${encodeURIComponent(
                      countryCode,
                    )}`,
                  )
                }
                onViewCollection={(countryCode) =>
                  router.push(
                    `/dashboard/collection?countryCode=${encodeURIComponent(
                      countryCode,
                    )}`,
                  )
                }
              />
            </Grid.Col>
          ))}
        </Grid>
      ) : null}
    </Stack>
  );
};

export default ExploreSection;