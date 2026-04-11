import countries from "world-countries";

const ISO2_TO_NAME = new Map<string, string>(
  countries.map((country) => [country.cca2.toUpperCase(), country.name.common]),
);

export function countryCodeToFlagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const base = 127397;
  return String.fromCodePoint(...Array.from(code).map((char) => base + char.charCodeAt(0)));
}

export function countryCodeToName(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  return ISO2_TO_NAME.get(code) ?? code;
}

/** Small PNG flag URL (flagcdn); same source as collection UI. */
export function countryCodeToFlagUrl(code?: string | null): string | null {
  const cc = code?.trim().toUpperCase();
  if (!cc || !/^[A-Z]{2}$/.test(cc)) return null;
  return `https://flagcdn.com/w20/${cc.toLowerCase()}.png`;
}

export function formatCountryLabel(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  const flag = countryCodeToFlagEmoji(code);
  const name = countryCodeToName(code);
  return `${flag ? `${flag} ` : ""}${name} (${code})`;
}

/** Flag + common name only (no ISO code). */
export function countryFlagAndName(countryCode: string): string {
  const flag = countryCodeToFlagEmoji(countryCode);
  const name = countryCodeToName(countryCode);
  return flag ? `${flag} ${name}` : name;
}
