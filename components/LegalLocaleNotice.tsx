'use client';
import { usePathname } from 'next/navigation';

export function LegalLocaleNotice() {
  const pathname = usePathname();
  if (!pathname.startsWith('/en')) return null;

  return (
    <aside
      role="note"
      lang="en"
      className="mb-8 p-4 border-l-4 border-amber-500 bg-amber-50 text-sm text-amber-900"
    >
      <strong>English version coming soon.</strong> This legal page is currently available in Serbian only.
      If you need an English version or assistance understanding the content before agreeing, please
      email <a href="mailto:kontakt@dodajuspomenu.com" className="underline">kontakt@dodajuspomenu.com</a>.
    </aside>
  );
}
