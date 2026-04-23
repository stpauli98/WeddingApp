import { preload } from "react-dom";
import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";

export default async function EnHomePage() {
  // LCP candidate: hero video's poster image. The <video> uses preload="none"
  // so we promote the poster here instead. Scoped per-page so admin/guest
  // routes don't pay for a resource they never render.
  preload("/videos/hero-guest-flow-poster.jpg", {
    as: "image",
    fetchPriority: "high",
  });

  const tiers = await getPricingPlansFromDb();
  const t = getServerT('en');
  return <ClientPage t={t} lang="en" tiers={tiers} />;
}
