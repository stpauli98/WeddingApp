// Email delivery via Nodemailer + SMTP (ADMIN_EMAIL / ADMIN_EMAIL_PASSWORD).
// Used by the retention cron to warn admins 2 days before their event data is deleted.
import nodemailer from 'nodemailer';

type Lang = 'sr' | 'en';

interface DeletionWarningParams {
  to: string;
  language?: Lang;
  coupleName: string;
  eventSlug: string;
  expiresAt: Date;
  imageCount: number;
  guestCount: number;
  messageCount: number;
  dashboardUrl: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error('ADMIN_EMAIL / ADMIN_EMAIL_PASSWORD not configured');
  }

  // Prefer explicit SMTP_SERVICE env var; fall back to domain-based detection.
  // Fail loudly on unknown domain so misconfiguration is caught immediately
  // rather than defaulting to Gmail and failing auth in production.
  const explicit = process.env.SMTP_SERVICE;
  const domain = user.split('@')[1]?.toLowerCase() ?? '';
  const serviceByDomain: Record<string, string> = {
    'gmail.com': 'gmail',
    'googlemail.com': 'gmail',
    'icloud.com': 'iCloud',
    'me.com': 'iCloud',
    'outlook.com': 'Outlook365',
    'hotmail.com': 'Outlook365',
  };
  const service = explicit || serviceByDomain[domain];
  if (!service) {
    throw new Error(
      `SMTP provider for email domain "${domain}" not recognized. ` +
        `Set SMTP_SERVICE env var (e.g. gmail, iCloud, Outlook365).`
    );
  }

  cachedTransporter = nodemailer.createTransport({ service, auth: { user, pass } });
  return cachedTransporter;
}

function fmtDate(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'sr' ? 'sr-Latn' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function renderWarning(p: DeletionWarningParams): { subject: string; html: string; text: string } {
  const lang: Lang = p.language === 'en' ? 'en' : 'sr';
  const expires = fmtDate(p.expiresAt, lang);

  if (lang === 'en') {
    const subject = `Your wedding data for ${p.coupleName} will be deleted in 2 days`;
    const text = [
      `Hi,`,
      ``,
      `Your storage plan expires on ${expires}. In 2 days we will permanently delete:`,
      `  • ${p.imageCount} photos`,
      `  • ${p.guestCount} guests`,
      `  • ${p.messageCount} messages`,
      ``,
      `Download everything now from your dashboard:`,
      p.dashboardUrl,
      ``,
      `After expiry, data cannot be recovered. Upgrade to a longer plan to keep it stored.`,
      ``,
      `— DodajUspomenu team`,
    ].join('\n');
    const html = warningHtml({
      heading: `Download your wedding data before it's deleted`,
      intro: `Your storage plan for <strong>${escape(p.coupleName)}</strong> expires on <strong>${expires}</strong>.`,
      bullets: [
        `${p.imageCount} photos`,
        `${p.guestCount} guests`,
        `${p.messageCount} messages`,
      ],
      cta: 'Open dashboard & download',
      ctaHref: p.dashboardUrl,
      footnote: 'After expiry, data cannot be recovered.',
    });
    return { subject, html, text };
  }

  const subject = `Tvoji podaci sa svadbe ${p.coupleName} se brišu za 2 dana`;
  const text = [
    `Zdravo,`,
    ``,
    `Tvoj plan čuvanja ističe ${expires}. Za 2 dana trajno brišemo:`,
    `  • ${p.imageCount} slika`,
    `  • ${p.guestCount} gostiju`,
    `  • ${p.messageCount} poruka`,
    ``,
    `Preuzmi sve sa dashboard-a:`,
    p.dashboardUrl,
    ``,
    `Nakon isteka podaci nisu obnovljivi. Pređi na duži plan da ih zadržiš.`,
    ``,
    `— DodajUspomenu tim`,
  ].join('\n');
  const html = warningHtml({
    heading: `Preuzmi podatke sa svadbe prije brisanja`,
    intro: `Tvoj plan čuvanja za <strong>${escape(p.coupleName)}</strong> ističe <strong>${expires}</strong>.`,
    bullets: [
      `${p.imageCount} slika`,
      `${p.guestCount} gostiju`,
      `${p.messageCount} poruka`,
    ],
    cta: 'Otvori dashboard i preuzmi',
    ctaHref: p.dashboardUrl,
    footnote: 'Nakon isteka podaci nisu obnovljivi.',
  });
  return { subject, html, text };
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function warningHtml(parts: {
  heading: string;
  intro: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
  footnote: string;
}): string {
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#faf7f2;margin:0;padding:24px;color:#2a2a2a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e8e2d6">
    <h1 style="font-size:20px;margin:0 0 12px">${escape(parts.heading)}</h1>
    <p style="line-height:1.5;margin:0 0 16px">${parts.intro}</p>
    <ul style="line-height:1.8;margin:0 0 24px;padding-left:20px">
      ${parts.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}
    </ul>
    <p style="margin:0 0 24px">
      <a href="${escape(parts.ctaHref)}"
         style="display:inline-block;background:#c89b5a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        ${escape(parts.cta)}
      </a>
    </p>
    <p style="font-size:13px;color:#7a7a7a;margin:0">${escape(parts.footnote)}</p>
  </div>
</body></html>`;
}

export async function sendDeletionWarningEmail(params: DeletionWarningParams): Promise<void> {
  const { subject, html, text } = renderWarning(params);
  await getTransporter().sendMail({
    from: process.env.ADMIN_EMAIL,
    to: params.to,
    subject,
    html,
    text,
  });
}

interface GuestDeletionParams {
  to: string;
  language?: Lang;
  coupleName: string;
  consented: boolean;
  /// Present only for consented guests — enables one-click unsubscribe.
  unsubscribeToken?: string;
}

function unsubUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dodajuspomenu.com';
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function sendGuestDeletionEmail(params: GuestDeletionParams): Promise<void> {
  const lang: Lang = params.language === 'en' ? 'en' : 'sr';
  const couple = escape(params.coupleName);

  const subject =
    lang === 'en'
      ? `Your photos from ${params.coupleName}'s wedding have been deleted`
      : `Tvoje slike sa svadbe ${params.coupleName} su obrisane`;

  const footer =
    params.consented
      ? lang === 'en'
        ? "Your email is kept so we can let you know about future weddings you're invited to."
        : 'Tvoj email je sačuvan da te obavijestimo o budućim svadbama.'
      : lang === 'en'
        ? 'Your data has been fully removed — no further emails will be sent.'
        : 'Svi tvoji podaci su uklonjeni — nećeš više dobijati poruke.';

  const unsubText =
    params.consented && params.unsubscribeToken
      ? lang === 'en'
        ? `\n\nUnsubscribe: ${unsubUrl(params.unsubscribeToken)}`
        : `\n\nOdjavi se: ${unsubUrl(params.unsubscribeToken)}`
      : '';

  const unsubHtml =
    params.consented && params.unsubscribeToken
      ? lang === 'en'
        ? `<p style="font-size:11px;color:#888;margin-top:18px">Don't want these? <a href="${escape(unsubUrl(params.unsubscribeToken))}">Unsubscribe</a></p>`
        : `<p style="font-size:11px;color:#888;margin-top:18px">Ne želiš ovo? <a href="${escape(unsubUrl(params.unsubscribeToken))}">Odjavi se</a></p>`
      : '';

  const text =
    lang === 'en'
      ? `Hi,\n\nPer the storage plan of ${params.coupleName}'s wedding, the photos and message you uploaded have been deleted.\n\n${footer}${unsubText}\n\n— DodajUspomenu team`
      : `Zdravo,\n\nPo planu čuvanja podataka za svadbu ${params.coupleName}, tvoje slike i poruka su obrisane.\n\n${footer}${unsubText}\n\n— DodajUspomenu tim`;

  const heading =
    lang === 'en' ? 'Your wedding photos have been deleted' : 'Tvoje slike su obrisane';
  const intro =
    lang === 'en'
      ? `Per the storage plan of <strong>${couple}</strong>'s wedding, the photos and message you uploaded have been deleted.`
      : `Po planu čuvanja podataka za svadbu <strong>${couple}</strong>, tvoje slike i poruka su obrisane.`;

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#faf7f2;margin:0;padding:24px;color:#2a2a2a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e8e2d6">
    <h1 style="font-size:20px;margin:0 0 12px">${escape(heading)}</h1>
    <p style="line-height:1.5;margin:0 0 16px">${intro}</p>
    <p style="font-size:13px;color:#7a7a7a;margin:0">${escape(footer)}</p>
    ${unsubHtml}
  </div>
</body></html>`;

  await getTransporter().sendMail({
    from: process.env.ADMIN_EMAIL,
    to: params.to,
    subject,
    html,
    text,
  });
}

// Legacy stub kept for compatibility with any external callers. Does nothing.
export async function sendVerificationEmail(_email: string, _code: string): Promise<void> {
  return Promise.resolve();
}
