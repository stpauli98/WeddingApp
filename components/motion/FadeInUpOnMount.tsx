'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInUpOnMountProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export function FadeInUpOnMount({
  children,
  delay = 0,
  duration = 0.7,
  className,
  ...rest
}: FadeInUpOnMountProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
