export type AsciiAtlasProps = {
  /** ISO 3166-1 alpha-2 codes the user has collected at least one artifact from (Mistral). */
  filledCountryCodes?: string[];
  /** ISO 3166-1 alpha-2 codes that appear in your artifacts catalog (shown as markers). */
  availableCountryCodes?: string[];
  /**
   * Optional labels for hover tooltips.
   * Key is ISO2 country code (e.g. "US"), value is artifact name(s).
   */
  artifactsByCountryCode?: Record<string, string | string[]>;
  /**
   * Optional map link per country (e.g. museum map URL from Supabase). Clicking the marker opens this.
   */
  mapUrlByCountryCode?: Record<string, string>;
};
