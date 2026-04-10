import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { CollectionArtifact } from "@/lib/types/collection";
import { supabase } from "@/lib/supabase/client";

/**
 * Column on `user_collections` that stores the owner's id (same as `profiles.id` / auth uid).
 * If your table uses `profile_id`, change this to `'profile_id'`.
 */
const USER_COLLECTIONS_USER_COLUMN = "user_id" as const;

type ArtifactRow = Record<string, unknown>;

function pickStr(row: ArtifactRow, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return fallback;
}

export function mapArtifactRow(row: ArtifactRow): CollectionArtifact | null {
  const id = row.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  return {
    id: String(id),
    title: pickStr(row, ["title", "name", "label"], "Artifact"),
    pixelImageUrl: pickStr(row, [
      "art_image_url",
      "pixel_image_url",
      "pixel_art_url",
      "image_8bit",
      "thumbnail_pixel_url",
      "image_pixel",
      "real_image_url",
      "real_photo_url",
      "full_image_url",
      "image_url",
      "photo_url",
    ]),
    realImageUrl: pickStr(row, [
      "real_image_url",
      "real_photo_url",
      "full_image_url",
      "image_url",
      "photo_url",
    ]),
    facts: pickStr(row, ["facts", "fun_fact", "description", "story", "caption"]),
  };
}

type CollectionState = {
  items: CollectionArtifact[];
  unlockedIds: string[];
  totalCatalogCount: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: CollectionState = {
  items: [],
  unlockedIds: [],
  totalCatalogCount: 0,
  status: "idle",
  error: null,
};

export const fetchUserCollection = createAsyncThunk(
  "collection/fetchUserCollection",
  async (userId: string, { rejectWithValue }) => {
    if (!supabase) {
      return rejectWithValue("Supabase client is not configured.");
    }

    const [{ data: artifactRows, error: artError }, ucResult] = await Promise.all([
      supabase.from("artifacts").select("*"),
      supabase.from("user_collections").select("artifact_id").eq(USER_COLLECTIONS_USER_COLUMN, userId),
    ]);

    if (artError) {
      return rejectWithValue(artError.message);
    }

    if (ucResult.error) {
      return rejectWithValue(ucResult.error.message);
    }

    const artifactIds = (ucResult.data ?? [])
      .map((r) => r.artifact_id as string | undefined)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const byId = new Map<string, CollectionArtifact>();
    for (const raw of artifactRows ?? []) {
      const mapped = mapArtifactRow(raw as ArtifactRow);
      if (mapped) byId.set(mapped.id, mapped);
    }

    const items = Array.from(byId.values());

    return {
      items,
      unlockedIds: artifactIds,
      totalCatalogCount: items.length,
    };
  },
);

const collectionSlice = createSlice({
  name: "collection",
  initialState,
  reducers: {
    clearCollection: (state) => {
      state.items = [];
      state.unlockedIds = [];
      state.totalCatalogCount = 0;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserCollection.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserCollection.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.unlockedIds = action.payload.unlockedIds;
        state.totalCatalogCount = action.payload.totalCatalogCount;
      })
      .addCase(fetchUserCollection.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Failed to load collection.";
      });
  },
});

export const { clearCollection } = collectionSlice.actions;
export const collectionReducer = collectionSlice.reducer;
