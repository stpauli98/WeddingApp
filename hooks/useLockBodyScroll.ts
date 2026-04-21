import { useEffect } from 'react';

/**
 * Locks `document.body` scroll while `active` is true. Compensates for the
 * scrollbar width on desktop so the page underneath doesn't shift when the
 * scrollbar disappears. No-op when `active` is false.
 */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const { body, documentElement } = document;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
    };
  }, [active]);
}
