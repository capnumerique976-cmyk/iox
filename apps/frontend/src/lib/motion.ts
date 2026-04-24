/**
 * IOX Premium — Framer Motion presets (DS-0)
 *
 * Presets centralisés pour éviter la duplication des `initial/animate/transition`
 * dans les pages. Alignés sur les animations CSS (`@keyframes iox-*`) de
 * `styles/globals.css` — même courbe, mêmes durées.
 *
 * Usage :
 *   import { motion } from "framer-motion";
 *   import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
 *
 *   <motion.div {...fadeInUp}>…</motion.div>
 *
 *   <motion.ul variants={staggerContainer} initial="hidden" animate="show">
 *     {items.map(i => <motion.li key={i.id} variants={staggerItem}>…</motion.li>)}
 *   </motion.ul>
 */
import type { Transition, Variants } from 'framer-motion';

// ─── Courbes & durées ──────────────────────────────────────────────────────
// Cubic-bezier "premium" (cf. --ease-premium dans globals.css).
export const EASE_PREMIUM: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const DURATION = {
  fast: 0.2,
  base: 0.3,
  slow: 0.5,
} as const;

// ─── Springs réutilisables ─────────────────────────────────────────────────
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 22,
};

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const springMetric: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 18,
};

// ─── Presets prêts à spreader sur motion.* ─────────────────────────────────
// { initial, animate, transition } — à utiliser tels quels.

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.base, ease: EASE_PREMIUM },
} as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow, ease: EASE_PREMIUM },
} as const;

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow, ease: EASE_PREMIUM },
} as const;

export const fadeInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: DURATION.base, ease: EASE_PREMIUM },
} as const;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: DURATION.base, ease: EASE_PREMIUM },
} as const;

// ─── Hover / tap interactions (spreader sur motion.button|div|…) ───────────
export const hoverLift = {
  whileHover: { y: -4, transition: { duration: DURATION.base, ease: EASE_PREMIUM } },
} as const;

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: springSnappy,
} as const;

export const tapScale = {
  whileTap: { scale: 0.97 },
} as const;

// ─── Stagger children (variants) ───────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_PREMIUM },
  },
};

// ─── Helper : fadeInUp différé (grilles de métriques / listes) ─────────────
export const fadeInUpDelayed = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow, ease: EASE_PREMIUM, delay },
});

// ─── Sheet / Dialog ────────────────────────────────────────────────────────
export const sheetRight: Variants = {
  hidden: { x: '100%' },
  show: { x: 0, transition: { duration: DURATION.base, ease: EASE_PREMIUM } },
  exit: { x: '100%', transition: { duration: DURATION.fast, ease: EASE_PREMIUM } },
};

export const sheetLeft: Variants = {
  hidden: { x: '-100%' },
  show: { x: 0, transition: { duration: DURATION.base, ease: EASE_PREMIUM } },
  exit: { x: '-100%', transition: { duration: DURATION.fast, ease: EASE_PREMIUM } },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

// ─── Reduced-motion helper ────────────────────────────────────────────────
// À utiliser en garde dans les composants sensibles (consommé via
// `useReducedMotion()` côté Framer — fourni ici comme fallback no-op).
export const noMotion = {
  initial: false,
  animate: false,
  transition: { duration: 0 },
} as const;
