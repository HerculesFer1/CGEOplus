/**
 * CGEO+ Motion System
 * Springs e easings inspirados na física de animação da Apple.
 * Usado por Framer Motion e transições CSS.
 */

import type { Transition, Variants } from "framer-motion";

export const spring = {
  gentle: { type: "spring", stiffness: 200, damping: 30 } as const satisfies Transition,
  snappy: { type: "spring", stiffness: 400, damping: 30 } as const satisfies Transition,
  bouncy: { type: "spring", stiffness: 300, damping: 20 } as const satisfies Transition,
} as const;

export const ease = {
  standard: [0.4, 0.0, 0.2, 1] as const,
  apple: [0.25, 0.1, 0.25, 1] as const,
  emphasized: [0.2, 0.0, 0, 1] as const,
} as const;

export const duration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

/** Fade + slide sutil — padrão para entrada de páginas e cards */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: ease.apple },
  },
};

/** Scale suave — padrão para modais e popovers */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring.snappy,
  },
};

/** Stagger para listas de cards */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};
