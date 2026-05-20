import { preload } from "react-dom";
import ClientPage from "@/components/ClientPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";
import { productSchema, softwareApplicationSchema } from "@/lib/seo/json-ld";

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
  return (
    <>
      <JsonLd id="jsonld-product-en" data={productSchema(tiers, 'en')} />
      <JsonLd id="jsonld-software-en" data={softwareApplicationSchema('en', tiers)} />
      <ClientPage t={t} lang="en" tiers={tiers} />
    </>
  );
}
