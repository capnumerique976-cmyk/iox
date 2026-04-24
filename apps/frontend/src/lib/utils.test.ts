import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (class-name merger)', () => {
  it('merge des classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('dédoublonne les classes Tailwind conflictuelles (dernière gagne)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('accepte les objets conditionnels', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('ignore les valeurs falsy', () => {
    expect(cn('a', null, undefined, false, '', 'b')).toBe('a b');
  });

  it('accepte les arrays imbriquées', () => {
    expect(cn(['a', 'b'], ['c'])).toBe('a b c');
  });
});
