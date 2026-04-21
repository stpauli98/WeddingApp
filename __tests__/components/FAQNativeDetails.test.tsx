import { render, screen, fireEvent } from '@testing-library/react';
import FAQ from '@/components/landingPage/FAQ';
import { getServerT } from '@/lib/i18n/server';

describe('FAQ — native <details> implementation', () => {
  it('renders 8 question/answer pairs', () => {
    const t = getServerT('sr');
    render(<FAQ t={t} />);
    const details = screen.getAllByRole('group');
    expect(details.length).toBe(8);
  });

  it('all items closed by default (native details behavior)', () => {
    const t = getServerT('sr');
    const { container } = render(<FAQ t={t} />);
    const opened = container.querySelectorAll('details[open]');
    expect(opened.length).toBe(0);
  });

  it('clicking summary opens the details panel', () => {
    const t = getServerT('sr');
    const { container } = render(<FAQ t={t} />);
    const firstSummary = container.querySelector('details > summary');
    expect(firstSummary).toBeTruthy();
    fireEvent.click(firstSummary as Element);
    const parent = firstSummary?.closest('details');
    expect(parent?.hasAttribute('open')).toBe(true);
  });
});
