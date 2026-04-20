'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ComponentType } from 'react';

interface CounterCardProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  target: number;
  suffix?: string;
  label: string;
  sublabel?: string;
  delay?: number;
  className?: string;
}

export function CounterCard({
  icon: Icon,
  target,
  suffix = '',
  label,
  sublabel,
  delay = 0,
  className,
}: CounterCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setCount(target);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let rafId: number | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 2000;
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(target * eased));
          if (progress < 1) {
            rafId = requestAnimationFrame(step);
          } else {
            setCount(target);
          }
        };
        rafId = requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [target, reduce]);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      <Icon aria-hidden="true" className="w-8 h-8 text-lp-accent mx-auto mb-3" />
      <div className="text-3xl md:text-4xl font-bold text-lp-text mb-1">
        {count}{suffix}
      </div>
      <div className="text-sm text-lp-muted-foreground">{label}</div>
      {sublabel && <div className="text-xs text-lp-muted-foreground mt-1">{sublabel}</div>}
    </motion.div>
  );
}
