import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";

export default async function SrHomePage() {
  const tiers = await getPricingPlansFromDb();
  return <ClientPage tiers={tiers} />;
}
