export type AsciiAtlasProps = {
  /** ISO 3166-1 alpha-2 codes the user has collected at least one artifact from (Mistral). */
  filledCountryCodes?: string[];
  /** ISO 3166-1 alpha-2 codes that appear in your artifacts catalog (shown as markers). */
  availableCountryCodes?: string[];
};
