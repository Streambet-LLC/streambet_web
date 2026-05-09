export const COLLECTION_CATEGORIES = [
  { value: 'sealed', label: 'Sealed' },
  { value: 'raw', label: 'Raw' },
  { value: 'slab', label: 'Slabs' },
  { value: 'pokemon', label: 'Pokemon' },
  { value: 'one_piece', label: 'One Piece' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
] as const;

export const COLLECTION_CATEGORY_VALUES = COLLECTION_CATEGORIES.map(c => c.value);
