import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";

export default async function EnHomePage() {
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('en');
  return <ClientPage t={t} lang="en" tiers={tiers} />;
}
