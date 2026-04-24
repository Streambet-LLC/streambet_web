export type EbayAccessMode = 'admin-only' | 'everyone';

export const ebayFeatureConfig = {
  enabled: true,
  accessMode: 'admin-only' as EbayAccessMode,
} as const;
