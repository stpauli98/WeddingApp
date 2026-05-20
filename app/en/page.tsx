import { preload } from "react-dom";
import Script from "next/script";
import ClientPage from "@/components/ClientPage";
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
      <Script id="jsonld-product-en" type="application/ld+json">
        {JSON.stringify(productSchema(tiers, 'en'))}
      </Script>
      <Script id="jsonld-software-en" type="application/ld+json">
        {JSON.stringify(softwareApplicationSchema('en', tiers))}
      </Script>
      <ClientPage t={t} lang="en" tiers={tiers} />
    </>
  );
}
