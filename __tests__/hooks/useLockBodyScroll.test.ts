import { renderHook } from '@testing-library/react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

describe('useLockBodyScroll', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('sets body.style.overflow to hidden when active=true', () => {
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('does nothing when active=false', () => {
    renderHook(() => useLockBodyScroll(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('restores previous overflow value on unmount', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('toggles when active prop flips', () => {
    const { rerender } = renderHook(({ active }) => useLockBodyScroll(active), {
      initialProps: { active: false },
    });
    expect(document.body.style.overflow).toBe('');
    rerender({ active: true });
    expect(document.body.style.overflow).toBe('hidden');
    rerender({ active: false });
    expect(document.body.style.overflow).toBe('');
  });
});
