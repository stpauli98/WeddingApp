/** @jest-environment jsdom */
// Regression test: verifies that I18nProvider seeds a fresh per-render i18next
// instance from the `locale` prop — not from a shared singleton. This is the
// fix for the recurring "server rendered SR, client expected EN" hydration
// mismatch caused by `lib/i18n/i18n.ts` — a module-level singleton whose
// language would leak across concurrent SSR requests.
//
// If a future refactor reintroduces a shared instance, the second assertion
// here will fail: the second render's provider would pick up whatever language
// the first render set, and both probes would show the same text.

import { render } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';

function Probe() {
  const { t } = useTranslation();
  return <span data-testid="probe">{t('hero.titleLine1')}</span>;
}

describe('I18nProvider — per-render isolation', () => {
  it('renders the Serbian translation when locale="sr"', () => {
    const { getByTestId } = render(
      <I18nProvider locale="sr">
        <Probe />
      </I18nProvider>
    );
    expect(getByTestId('probe').textContent).toBe('Sve uspomene');
  });

  it('renders the English translation when locale="en"', () => {
    const { getByTestId } = render(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    );
    expect(getByTestId('probe').textContent).toBe('All your wedding');
  });

  it('two concurrent providers do not pollute each other', () => {
    // Mount both in the same render tree. If the provider used a shared
    // singleton, both probes would show whichever locale initialized last.
    const { getAllByTestId } = render(
      <>
        <I18nProvider locale="sr">
          <Probe />
        </I18nProvider>
        <I18nProvider locale="en">
          <Probe />
        </I18nProvider>
      </>
    );
    const [sr, en] = getAllByTestId('probe');
    expect(sr.textContent).toBe('Sve uspomene');
    expect(en.textContent).toBe('All your wedding');
  });
});
