import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { JourneyResponse } from '@/hooks/use-user-journey';

/* ------------------------------------------------------------------ */
/*  Mocks                                                               */
/* ------------------------------------------------------------------ */

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseUserJourney = vi.fn();
vi.mock('@/hooks/use-user-journey', () => ({
  useUserJourney: () => mockUseUserJourney(),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="skeleton" {...props} />,
}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                            */
/* ------------------------------------------------------------------ */

const JOURNEY_INCOMPLETE: JourneyResponse = {
  role: 'MARKETPLACE_SELLER' as any,
  completionPercentage: 33,
  nextAction: { label: 'Compléter votre profil', href: '/seller/profile/edit' },
  steps: [
    { id: 'profile', label: 'Profil', completed: true, current: false, href: '/seller/profile/edit' },
    { id: 'products', label: 'Produits', completed: false, current: true, href: '/seller/marketplace-products' },
    { id: 'publish', label: 'Publication', completed: false, current: false, href: '/seller/marketplace-products' },
  ],
  data: {} as any,
};

const JOURNEY_COMPLETE: JourneyResponse = {
  ...JOURNEY_INCOMPLETE,
  completionPercentage: 100,
  nextAction: null,
  steps: JOURNEY_INCOMPLETE.steps.map((s) => ({ ...s, completed: true, current: false })),
};

/* ------------------------------------------------------------------ */
/*  Import SUT after mocks                                              */
/* ------------------------------------------------------------------ */

// Must import AFTER vi.mock calls so hoisting picks up the mocks
import { GuidedDashboardHeader } from './guided-dashboard-header';

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe('GuidedDashboardHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseUserJourney.mockReturnValue({ journey: null, loading: false, error: null });
    const { container } = render(<GuidedDashboardHeader />);
    expect(container.innerHTML).toBe('');
  });

  it('shows skeleton while loading', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: null, loading: true, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1);
  });

  it('returns null on error', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: null, loading: false, error: 'Network error' });
    const { container } = render(<GuidedDashboardHeader />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Bonjour Fatima" when journey is incomplete', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_INCOMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getByText('Bonjour Fatima')).toBeInTheDocument();
  });

  it('shows "Bravo Fatima !" when journey is complete', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_COMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getByText('Bravo Fatima !')).toBeInTheDocument();
  });

  it('shows the progress stepper when journey is not complete', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_INCOMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getByText('Votre progression')).toBeInTheDocument();
    expect(screen.getByText('33 %')).toBeInTheDocument();
  });

  it('hides the progress stepper when journey is complete', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_COMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.queryByText('Votre progression')).not.toBeInTheDocument();
  });

  it('shows the next action card when nextAction exists', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: 'Fatima', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_INCOMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getByText('Prochaine étape')).toBeInTheDocument();
    expect(screen.getByText('Compléter votre profil')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compléter votre profil/i })).toHaveAttribute(
      'href',
      '/seller/profile/edit',
    );
  });

  it('uses fallback "vous" when firstName is empty', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: '', role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_INCOMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getByText('Bonjour vous')).toBeInTheDocument();
  });

  it('uses fallback "vous" when firstName is null', () => {
    mockUseAuth.mockReturnValue({ user: { firstName: null, role: 'MARKETPLACE_SELLER' } });
    mockUseUserJourney.mockReturnValue({ journey: JOURNEY_INCOMPLETE, loading: false, error: null });
    render(<GuidedDashboardHeader />);
    expect(screen.getByText('Bonjour vous')).toBeInTheDocument();
  });
});
