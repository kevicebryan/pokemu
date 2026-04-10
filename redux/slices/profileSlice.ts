import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabase/client";

type ProfileRecord = {
  id: string;
  username: string;
  hearts: number;
  last_heart_reset: string | null;
  total_items_restored: number;
  updated_at: string | null;
};

type ProfileState = {
  profile: ProfileRecord | null;
  /** Row count in `user_collections` for this user (source of truth for “artifacts restored”). */
  collectedArtifactCount: number;
  unlockedCountryCodes: string[];
  availableCountryCodes: string[];
  artifactsByCountryCode: Record<string, string[]>;
  unlockedRegions: string[];
  availableRegions: string[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: ProfileState = {
  profile: null,
  collectedArtifactCount: 0,
  unlockedCountryCodes: [],
  availableCountryCodes: [],
  artifactsByCountryCode: {},
  unlockedRegions: [],
  availableRegions: [],
  status: "idle",
  error: null,
};

type ArtifactGeoRow = {
  country_code: string | null;
  region: string | null;
} & Record<string, unknown>;

type UserCollectionArtifactRow = {
  artifacts: ArtifactGeoRow | ArtifactGeoRow[] | null;
};

type ProfileFetchResult = {
  profile: ProfileRecord | null;
  collectedArtifactCount: number;
  unlockedCountryCodes: string[];
  availableCountryCodes: string[];
  artifactsByCountryCode: Record<string, string[]>;
  unlockedRegions: string[];
  availableRegions: string[];
};

function normalizeCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRegion(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asSortedStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").sort();
}

function pickArtifactName(row: Record<string, unknown>): string | null {
  for (const key of ["title", "name", "label"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export const fetchProfileByUserId = createAsyncThunk(
  "profile/fetchByUserId",
  async (userId: string, { rejectWithValue }) => {
    if (!supabase) {
      return rejectWithValue("Supabase client is not configured.");
    }

    const [profileResult, availableGeoResult, collectionGeoResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, username, hearts, last_heart_reset, total_items_restored, updated_at",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("artifacts").select("*"),
        supabase
          .from("user_collections")
          .select(
            "artifacts:artifacts!user_collections_artifact_id_fkey(country_code, region)",
          )
          .eq("user_id", userId),
      ]);

    if (profileResult.error) {
      return rejectWithValue(profileResult.error.message);
    }
    if (availableGeoResult.error) {
      return rejectWithValue(availableGeoResult.error.message);
    }
    if (collectionGeoResult.error) {
      return rejectWithValue(collectionGeoResult.error.message);
    }

    const availableCountries = new Set<string>();
    const availableRegions = new Set<string>();
    const artifactsByCountryCode = new Map<string, Set<string>>();
    const unlockedCountries = new Set<string>();
    const unlockedRegions = new Set<string>();

    const collectionRows = (collectionGeoResult.data ??
      []) as UserCollectionArtifactRow[];

    for (const artifact of (availableGeoResult.data ??
      []) as ArtifactGeoRow[]) {
      const countryCode = normalizeCode(artifact.country_code);
      const region = normalizeRegion(artifact.region);
      if (countryCode) availableCountries.add(countryCode);
      if (region) availableRegions.add(region);
      if (countryCode) {
        const artifactName = pickArtifactName(artifact);
        if (artifactName) {
          if (!artifactsByCountryCode.has(countryCode)) {
            artifactsByCountryCode.set(countryCode, new Set<string>());
          }
          artifactsByCountryCode.get(countryCode)?.add(artifactName);
        }
      }
    }

    for (const collection of collectionRows) {
      const artifact = Array.isArray(collection.artifacts)
        ? (collection.artifacts[0] ?? null)
        : collection.artifacts;
      const countryCode = normalizeCode(artifact?.country_code);
      const region = normalizeRegion(artifact?.region);
      if (countryCode) unlockedCountries.add(countryCode);
      if (region) unlockedRegions.add(region);
    }

    const result: ProfileFetchResult = {
      profile: profileResult.data as ProfileRecord | null,
      collectedArtifactCount: collectionRows.length,
      unlockedCountryCodes: Array.from(unlockedCountries).sort(),
      availableCountryCodes: Array.from(availableCountries).sort(),
      artifactsByCountryCode: Object.fromEntries(
        Array.from(artifactsByCountryCode.entries()).map(([countryCode, names]) => [
          countryCode,
          Array.from(names).sort(),
        ]),
      ),
      unlockedRegions: Array.from(unlockedRegions).sort(),
      availableRegions: Array.from(availableRegions).sort(),
    };

    return result;
  },
);

export const upsertProfile = createAsyncThunk(
  "profile/upsert",
  async (
    payload: {
      id: string;
      username: string;
    },
    { rejectWithValue },
  ) => {
    if (!supabase) {
      return rejectWithValue("Supabase client is not configured.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select(
        "id, username, hearts, last_heart_reset, total_items_restored, updated_at",
      )
      .single();

    if (error) {
      return rejectWithValue(error.message);
    }

    return data as ProfileRecord;
  },
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null;
      state.collectedArtifactCount = 0;
      state.unlockedCountryCodes = [];
      state.availableCountryCodes = [];
      state.artifactsByCountryCode = {};
      state.unlockedRegions = [];
      state.availableRegions = [];
      state.status = "idle";
      state.error = null;
    },
    setHearts: (state, action: { payload: number }) => {
      if (state.profile) state.profile.hearts = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileByUserId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProfileByUserId.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload.profile;
        state.collectedArtifactCount = action.payload.collectedArtifactCount;
        state.unlockedCountryCodes = asSortedStringArray(
          action.payload.unlockedCountryCodes,
        );
        state.availableCountryCodes = asSortedStringArray(
          action.payload.availableCountryCodes,
        );
        state.artifactsByCountryCode = action.payload.artifactsByCountryCode ?? {};
        state.unlockedRegions = asSortedStringArray(action.payload.unlockedRegions);
        state.availableRegions = asSortedStringArray(
          action.payload.availableRegions,
        );
      })
      .addCase(fetchProfileByUserId.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Failed to fetch profile.";
      })
      .addCase(upsertProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(upsertProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(upsertProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Failed to save profile.";
      });
  },
});

export const { clearProfile, setHearts } = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
