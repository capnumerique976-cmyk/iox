'use client';

/**
 * useUserJourney — fetch and cache the user's guided journey state.
 *
 * Calls GET /users/me/journey and returns:
 *   - journey data (steps, completion %, nextAction)
 *   - loading / error state
 *   - refresh() to re-fetch on demand
 *
 * The response is cached in-memory for the session. A manual
 * refresh() is needed after the user completes a step.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth.context';
import { UserRole } from '@iox/shared';

/* ------------------------------------------------------------------ */
/*  Types (mirrored from backend JourneyResponse)                       */
/* ------------------------------------------------------------------ */

export interface JourneyStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  href: string;
}

export interface JourneyData {
  hasCompany: boolean;
  hasSellerProfile: boolean;
  sellerProfileStatus: string | null;
  sellerProfileComplete: boolean;
  hasProducts: boolean;
  hasPublishedProducts: boolean;
  productCount: number;
  publishedProductCount: number;
  hasDocuments: boolean;
  hasPendingRfqs: boolean;
  rfqCount: number;
  hasInvoices: boolean;
  hasStripeAccount: boolean;
}

export interface JourneyResponse {
  role: UserRole;
  completionPercentage: number;
  nextAction: { label: string; href: string } | null;
  steps: JourneyStep[];
  data: JourneyData;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useUserJourney() {
  const { user } = useAuth();
  const [journey, setJourney] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchJourney = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<JourneyResponse>('/users/me/journey');
      setJourney(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchJourney();
  }, [user, fetchJourney]);

  return {
    journey,
    loading,
    error,
    /** Re-fetch journey (call after user completes a step). */
    refresh: fetchJourney,
    /** Convenience: is the user a marketplace user needing guided mode? */
    isGuided:
      user?.role === UserRole.MARKETPLACE_SELLER ||
      user?.role === UserRole.MARKETPLACE_BUYER,
  };
}
