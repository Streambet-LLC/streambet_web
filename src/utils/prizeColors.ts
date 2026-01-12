/**
 * Shared color constants for prize badges and progress
 * Supports up to 10 prize levels with distinct colors
 */

/**
 * Unified prize color palette
 * Each color has variants for text, background, border, and ring/shadow
 */
const PRIZE_COLOR_PALETTE = [
  { 
    base: 'amber-500',
    text: 'text-amber-500',
    bg: 'bg-amber-500',
    border: 'border-amber-500',
    ring: 'ring-amber-500 shadow-amber-500/50'
  },
  { 
    base: 'blue-500',
    text: 'text-blue-500',
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    ring: 'ring-blue-500 shadow-blue-500/50'
  },
  { 
    base: 'purple-500',
    text: 'text-purple-500',
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    ring: 'ring-purple-500 shadow-purple-500/50'
  },
  { 
    base: 'emerald-500',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500 shadow-emerald-500/50'
  },
  { 
    base: 'rose-500',
    text: 'text-rose-500',
    bg: 'bg-rose-500',
    border: 'border-rose-500',
    ring: 'ring-rose-500 shadow-rose-500/50'
  },
  { 
    base: 'cyan-500',
    text: 'text-cyan-500',
    bg: 'bg-cyan-500',
    border: 'border-cyan-500',
    ring: 'ring-cyan-500 shadow-cyan-500/50'
  },
  { 
    base: 'orange-500',
    text: 'text-orange-500',
    bg: 'bg-orange-500',
    border: 'border-orange-500',
    ring: 'ring-orange-500 shadow-orange-500/50'
  },
  { 
    base: 'pink-500',
    text: 'text-pink-500',
    bg: 'bg-pink-500',
    border: 'border-pink-500',
    ring: 'ring-pink-500 shadow-pink-500/50'
  },
  { 
    base: 'lime-500',
    text: 'text-lime-500',
    bg: 'bg-lime-500',
    border: 'border-lime-500',
    ring: 'ring-lime-500 shadow-lime-500/50'
  },
  { 
    base: 'indigo-500',
    text: 'text-indigo-500',
    bg: 'bg-indigo-500',
    border: 'border-indigo-500',
    ring: 'ring-indigo-500 shadow-indigo-500/50'
  },
] as const;

/**
 * Get prize color by index
 * @param index Prize index (0-9)
 * @param colorType Type of color to retrieve
 * @returns Tailwind color class string
 */
export const getPrizeColor = (
  index: number,
  colorType: 'text' | 'bg' | 'border' | 'ring' = 'text'
): string => {
  const normalizedIndex = index % 10; // Wrap around if > 10
  return PRIZE_COLOR_PALETTE[normalizedIndex][colorType];
};

/**
 * Get badge ring color for avatar (includes shadow)
 * @param badgeLevel Badge level as string (numeric index or 'none')
 * @returns Tailwind ring and shadow classes
 */
export const getBadgeRingColor = (badgeLevel: string): string => {
  if (badgeLevel === 'none') {
    return 'ring-gray-500 shadow-gray-500/30';
  }
  
  const index = parseInt(badgeLevel, 10);
  if (isNaN(index)) {
    return 'ring-gray-500 shadow-gray-500/30';
  }
  
  return getPrizeColor(index, 'ring');
};
