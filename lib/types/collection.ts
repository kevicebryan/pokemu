/** Normalized artifact row for UI (maps various possible Supabase column names). */
export type CollectionArtifact = {
  id: string;
  title: string;
  pixelImageUrl: string;
  realImageUrl: string;
  facts: string;
  /** Optional: year/era label (e.g. "210 BCE" or "1974"). */
  year?: string;
  /** Optional: ISO-3166 alpha-2 (e.g. "CN", "EG"). */
  countryCode?: string;
  /** Optional: human readable country name (e.g. "China"). */
  countryName?: string;
};
