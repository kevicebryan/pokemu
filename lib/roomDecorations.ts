import { supabase } from "@/lib/supabase/client";

/** Legacy grid size (12×12); used only to map old rows before pos_* columns existed. */
const LEGACY_GRID_MAX = 11;

export type RoomDecoration = {
  id: string;
  user_id: string;
  artifact_id: string;
  /** Horizontal center of the tile, 0–100 (% of room box width). */
  pos_left_pct: number;
  /** Vertical center of the tile, 0–100 (% of room box height). */
  pos_top_pct: number;
  art_image_url: string;
  title: string;
};

type DecorationRow = {
  id: string;
  user_id: string;
  artifact_id: string;
  grid_x: number;
  grid_y: number;
  pos_left_pct?: number | null;
  pos_top_pct?: number | null;
  artifacts:
    | { art_image_url?: string | null; name?: string | null }
    | { art_image_url?: string | null; name?: string | null }[]
    | null;
};

function pickArtifactMeta(
  nested: DecorationRow["artifacts"],
): { art_image_url: string; name: string } {
  const row = Array.isArray(nested) ? nested[0] : nested;
  const art_image_url =
    typeof row?.art_image_url === "string" && row.art_image_url.length > 0
      ? row.art_image_url
      : "";
  const name =
    typeof row?.name === "string" && row.name.length > 0 ? row.name : "Artifact";
  return { art_image_url, name };
}

function pctFromRow(r: DecorationRow): {
  pos_left_pct: number;
  pos_top_pct: number;
} {
  const pl = r.pos_left_pct;
  const pt = r.pos_top_pct;
  if (
    typeof pl === "number" &&
    typeof pt === "number" &&
    !Number.isNaN(pl) &&
    !Number.isNaN(pt)
  ) {
    return { pos_left_pct: pl, pos_top_pct: pt };
  }
  return {
    pos_left_pct: (r.grid_x / LEGACY_GRID_MAX) * 100,
    pos_top_pct: (r.grid_y / LEGACY_GRID_MAX) * 100,
  };
}

/** Minimum fraction of the room side (1/8 = 12.5%). */
export const ROOM_DECORATION_TILE_MIN_PCT = 100 / 8;

/**
 * Width and height of each decoration as % of the room box.
 * At least {@link ROOM_DECORATION_TILE_MIN_PCT} (1/8); slightly larger for easier dragging.
 */
export const ROOM_DECORATION_TILE_PCT = 18;

export const ROOM_DECORATION_TILE_HALF_PCT = ROOM_DECORATION_TILE_PCT / 2;

/** Keep tile center inside the room so the full tile stays visible. */
export function clampDecorationCenterPct(
  pos_left_pct: number,
  pos_top_pct: number,
  tileHalfPct = ROOM_DECORATION_TILE_HALF_PCT,
): { pos_left_pct: number; pos_top_pct: number } {
  const lo = tileHalfPct;
  const hi = 100 - tileHalfPct;
  return {
    pos_left_pct: Math.min(hi, Math.max(lo, pos_left_pct)),
    pos_top_pct: Math.min(hi, Math.max(lo, pos_top_pct)),
  };
}

export async function fetchRoomDecorations(
  roomOwnerUserId: string,
): Promise<{ data: RoomDecoration[]; error: string | null }> {
  if (!supabase) {
    return { data: [], error: "Supabase client is not configured." };
  }

  const { data, error } = await supabase
    .from("room_decorations")
    .select(
      `
      id,
      user_id,
      artifact_id,
      grid_x,
      grid_y,
      pos_left_pct,
      pos_top_pct,
      artifacts (
        art_image_url,
        name
      )
    `,
    )
    .eq("user_id", roomOwnerUserId);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data ?? []) as DecorationRow[];
  const mapped: RoomDecoration[] = rows.map((r) => {
    const meta = pickArtifactMeta(r.artifacts);
    const { pos_left_pct, pos_top_pct } = pctFromRow(r);
    return {
      id: r.id,
      user_id: r.user_id,
      artifact_id: r.artifact_id,
      pos_left_pct,
      pos_top_pct,
      art_image_url: meta.art_image_url,
      title: meta.name,
    };
  });

  return { data: mapped, error: null };
}

export type OtherRoomOwner = {
  userId: string;
  username: string | null;
  decorationCount: number;
  previewImageUrl: string | null;
};

export async function fetchRoomOwnerUsername(
  userId: string,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabase) {
    return { data: null, error: "Supabase client is not configured." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  const username =
    typeof (data as { username?: string | null } | null)?.username === "string"
      ? (data as { username: string }).username.trim()
      : "";

  return { data: username || null, error: null };
}

/**
 * Users who have at least one room decoration. Optionally excludes one id (e.g. current user).
 */
export async function fetchOtherRoomOwners(
  excludeUserId: string | null,
): Promise<{ data: OtherRoomOwner[]; error: string | null }> {
  if (!supabase) {
    return { data: [], error: "Supabase client is not configured." };
  }

  const { data, error } = await supabase.from("room_decorations").select(
    `
      user_id,
      artifacts (
        art_image_url
      )
    `,
  );

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data ?? []) as {
    user_id: string;
    artifacts: DecorationRow["artifacts"];
  }[];

  const aggregated = new Map<
    string,
    { count: number; previewImageUrl: string | null }
  >();

  for (const row of rows) {
    if (excludeUserId && row.user_id === excludeUserId) {
      continue;
    }
    const meta = pickArtifactMeta(row.artifacts);
    const url =
      meta.art_image_url.length > 0 ? meta.art_image_url : null;
    const cur = aggregated.get(row.user_id);
    if (!cur) {
      aggregated.set(row.user_id, { count: 1, previewImageUrl: url });
    } else {
      cur.count += 1;
      if (!cur.previewImageUrl && url) {
        cur.previewImageUrl = url;
      }
    }
  }

  const userIds = [...aggregated.keys()];
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  if (profileError) {
    return { data: [], error: profileError.message };
  }

  const usernameById = new Map<string, string | null>();
  for (const p of profileRows ?? []) {
    const id = typeof p.id === "string" ? p.id : "";
    if (!id) continue;
    usernameById.set(
      id,
      typeof p.username === "string" ? p.username : null,
    );
  }

  const owners: OtherRoomOwner[] = userIds.map((userId) => {
    const agg = aggregated.get(userId)!;
    return {
      userId,
      username: usernameById.get(userId) ?? null,
      decorationCount: agg.count,
      previewImageUrl: agg.previewImageUrl,
    };
  });

  owners.sort((a, b) => {
    const an = (a.username ?? "").trim().toLowerCase();
    const bn = (b.username ?? "").trim().toLowerCase();
    if (an && bn && an !== bn) return an.localeCompare(bn);
    if (an && !bn) return -1;
    if (!an && bn) return 1;
    return a.userId.localeCompare(b.userId);
  });

  return { data: owners, error: null };
}

export async function addRoomDecoration(
  roomOwnerUserId: string,
  artifactId: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("room_decorations")
    .select("id")
    .eq("user_id", roomOwnerUserId)
    .eq("artifact_id", artifactId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }
  if (existing) {
    return { error: "This artifact is already in the room." };
  }

  const insertPayload: Record<string, unknown> = {
    user_id: roomOwnerUserId,
    artifact_id: artifactId,
    pos_left_pct: 50,
    pos_top_pct: 50,
  };

  const { error } = await supabase.from("room_decorations").insert(insertPayload);

  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Persist decoration centers (percent of room box). No grid / collision rules.
 */
export async function syncRoomDecorationsToDatabase(
  roomOwnerUserId: string,
  desired: Pick<RoomDecoration, "id" | "pos_left_pct" | "pos_top_pct">[],
): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  for (const d of desired) {
    const c = clampDecorationCenterPct(d.pos_left_pct, d.pos_top_pct);
    const { error } = await supabase
      .from("room_decorations")
      .update({
        pos_left_pct: c.pos_left_pct,
        pos_top_pct: c.pos_top_pct,
      })
      .eq("id", d.id)
      .eq("user_id", roomOwnerUserId);

    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}
