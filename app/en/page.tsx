import { Inter } from "next/font/google";
import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";

const inter = Inter({ subsets: ["latin"] });

export default async function EnHomePage() {
  const tiers = await getPricingPlansFromDb();
  return (
    <main id="main-content" className={`min-h-screen bg-background ${inter.className}`}>
      <ClientPage tiers={tiers} />
    </main>
  );
}
