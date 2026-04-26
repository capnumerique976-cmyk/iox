/**
 * Slug ASCII-safe depuis un libellé libre. Diacritiques retirés via NFD,
 * caractères non `[a-z0-9]` remplacés par `-`, doublons compactés, trims.
 *
 * NOTE : extrait de `page.tsx` car Next.js App Router interdit les exports
 * nommés non standard sur les modules Page (build error
 * "<X> is not a valid Page export field").
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
