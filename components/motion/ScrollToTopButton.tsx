'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  label: string;
}

export function ScrollToTopButton({ label }: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label={label}
          onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 8 }}
          className="fixed bottom-6 right-6 z-40 p-3 bg-primary text-white rounded-full shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        >
          <ChevronUp aria-hidden="true" className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
