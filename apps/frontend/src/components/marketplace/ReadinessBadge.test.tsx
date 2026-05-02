import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadinessBadge } from './ReadinessBadge';
import type { ReadinessStatus } from '@/lib/marketplace/types';

describe('ReadinessBadge', () => {
  it('renders the correct label for EXPORT_READY status', () => {
    render(<ReadinessBadge status="EXPORT_READY" />);
    expect(screen.getByText('Export prêt')).toBeInTheDocument();
  });

  it('renders the correct label for NOT_ELIGIBLE status', () => {
    render(<ReadinessBadge status="NOT_ELIGIBLE" />);
    expect(screen.getByText('Non éligible export')).toBeInTheDocument();
  });

  it('renders distinct labels for all six statuses', () => {
    const statuses: ReadinessStatus[] = [
      'NOT_ELIGIBLE',
      'INTERNAL_ONLY',
      'PENDING_DOCUMENTS',
      'PENDING_QUALITY_REVIEW',
      'EXPORT_READY',
      'EXPORT_READY_WITH_CONDITIONS',
    ];
    const expectedLabels = [
      'Non éligible export',
      'Marché local',
      'Docs attendus',
      'Revue qualité',
      'Export prêt',
      'Export sous conditions',
    ];
    statuses.forEach((status, i) => {
      const { unmount } = render(<ReadinessBadge status={status} />);
      expect(screen.getByText(expectedLabels[i])).toBeInTheDocument();
      unmount();
    });
  });

  it('applies custom className alongside default classes', () => {
    const { container } = render(
      <ReadinessBadge status="EXPORT_READY" className="my-custom-class" />,
    );
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('my-custom-class');
    expect(badge).toHaveClass('rounded-full');
  });
});
