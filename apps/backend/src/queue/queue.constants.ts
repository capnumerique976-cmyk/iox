// Queue names and job names — single source of truth for the BullMQ setup.

export const QUEUE_NAMES = {
  EMAIL: 'iox.email',
  SEARCH: 'iox.search',
} as const;

export const EMAIL_JOB_NAMES = {
  SEND: 'send',
} as const;

export const SEARCH_JOB_NAMES = {
  INDEX_PRODUCT: 'index_product',
  INDEX_SELLER: 'index_seller',
} as const;
