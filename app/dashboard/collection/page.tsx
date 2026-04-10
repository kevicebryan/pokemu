import { CollectionView } from "@/components/sections/collection/CollectionView";

type DashboardCollectionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeCountryCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export default async function DashboardCollectionPage({
  searchParams,
}: DashboardCollectionPageProps) {
  const sp = (await searchParams) ?? {};
  const raw = sp.countryCode;
  const countryCode =
    typeof raw === "string" ? normalizeCountryCode(raw) : null;

  return <CollectionView initialCountryCode={countryCode} />;
}
