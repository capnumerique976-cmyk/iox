'use client';

/**
 * IOX UI — MetricCard (DS-1)
 *
 * Carte de métrique dashboard. Compose `Card` variant="metric" +
 * Framer Motion (fadeInUp + spring sur la valeur). Le composant est
 * autoporteur : label, value, icône, trend optionnel.
 *
 * Exemples :
 *   <MetricCard label="Produits" value={42} icon={Package} />
 *   <MetricCard
 *     label="Commandes actives"
 *     value={12}
 *     icon={Truck}
 *     color="#2D9CDB"
 *     trend="+12%"
 *     trendUp
 *     delay={0.1}
 *   />
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { EASE_PREMIUM, springMetric, DURATION } from '@/lib/motion';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  /** Couleur d'accent (hex). Default : premium-accent (#2D9CDB). */
  color?: string;
  /** Variation chiffrée avec icône (ex. "+12%"). Implique trendUp. */
  trend?: string;
  trendUp?: boolean;
  /** Texte secondaire neutre (ex. "85 actifs"). Affiché sans icône. */
  sub?: React.ReactNode;
  /** Délai d'entrée (pour stagger dans une grille). */
  delay?: number;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  color = '#2D9CDB',
  trend,
  trendUp = false,
  sub,
  delay = 0,
  className,
}: MetricCardProps) {
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE_PREMIUM, delay }}
    >
      <Card
        variant="metric"
        className={cn(
          'group/metric relative overflow-hidden p-4 transition-all duration-base ease-premium',
          'hover:-translate-y-0.5 hover:border-premium-accent/40 hover:shadow-glow-cyan-sm',
          className,
        )}
      >
        {/* Accent premium — fine ligne top cyan→violet révélée au hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-premium-accent/40 to-transparent opacity-0 transition-opacity duration-base ease-premium group-hover/metric:opacity-100"
        />
        <div className="relative z-[1] flex items-start justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs text-muted-foreground">{label}</p>
            <motion.p
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...springMetric, delay: delay + 0.15 }}
            >
              {value}
            </motion.p>
            {trend ? (
              <div
                className={cn(
                  'mt-1 flex items-center gap-1 text-xs',
                  trendUp ? 'text-premium-success' : 'text-muted-foreground',
                )}
              >
                <TrendIcon className="h-3 w-3" aria-hidden />
                <span>{trend}</span>
              </div>
            ) : sub ? (
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            ) : null}
          </div>

          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${color}26 0%, ${color}40 100%)`,
              boxShadow: `0 4px 12px ${color}33`,
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Icon className="h-6 w-6" style={{ color }} aria-hidden />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
