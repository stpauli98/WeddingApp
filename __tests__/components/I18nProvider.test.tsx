import { render } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';

function Probe() {
  const { t } = useTranslation();
  return <span data-testid="probe">{t('hero.titleLine1')}</span>;
}

describe('I18nProvider — renders children immediately', () => {
  it('does not return null on first render', () => {
    const { getByTestId } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    const el = getByTestId('probe');
    expect(el.textContent).toBeTruthy();
    expect(el.textContent).not.toBe('hero.titleLine1');
  });
});
