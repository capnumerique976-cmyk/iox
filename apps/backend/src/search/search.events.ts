// Search sync events — emitted by domain services, consumed by SearchEventListener.
//
// Naming convention: `<entity>.<action>` → e.g. `product.created`.
// Payload: entity ID only — the listener fetches fresh data from Prisma.

export const PRODUCT_CREATED = 'product.created';
export const PRODUCT_UPDATED = 'product.updated';
export const PRODUCT_STATUS_CHANGED = 'product.status_changed';

export const SELLER_CREATED = 'seller.created';
export const SELLER_UPDATED = 'seller.updated';
export const SELLER_STATUS_CHANGED = 'seller.status_changed';

export interface SearchEntityEvent {
  entityId: string;
}
