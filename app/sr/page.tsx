import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";

export default async function SrHomePage() {
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return <ClientPage t={t} lang="sr" tiers={tiers} />;
}
