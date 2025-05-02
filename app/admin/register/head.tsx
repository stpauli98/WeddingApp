// SEO & Open Graph meta za DodajUspomenu admin registraciju
export default function Head() {
  return (
    <>
      <title>Admin Registracija | DodajUspomenu</title>
      <meta name="description" content="Registracija za administratore svadbenih događaja u aplikaciji DodajUspomenu." />
      <meta name="robots" content="noindex, nofollow" />

      {/* Open Graph meta */}
      <meta property="og:title" content="Admin Registracija | DodajUspomenu" />
      <meta property="og:description" content="Registracija za administratore svadbenih događaja u aplikaciji DodajUspomenu." />
      <meta property="og:url" content="https://www.mojasvadbaa.com/admin/register" />
      <meta property="og:site_name" content="DodajUspomenu" />
      <meta property="og:locale" content="sr_RS" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/favicon.ico" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Admin Registracija | DodajUspomenu" />
    </>
  );
}
