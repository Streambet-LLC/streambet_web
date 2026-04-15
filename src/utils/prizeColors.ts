/**
 * Shared color constants for prize badges and progress
 * CardCade brand palette — neon lime/green tones
 */

/**
 * Unified prize color palette
 * Each color has variants for text, background, border, and ring/shadow
 */
const PRIZE_COLOR_PALETTE = [
  { 
    base: 'lime-400',
    text: 'text-lime-400',
    bg: 'bg-lime-400',
    border: 'border-lime-400',
    ring: 'ring-lime-400 shadow-lime-400/50'
  },
  { 
    base: 'green-400',
    text: 'text-green-400',
    bg: 'bg-green-400',
    border: 'border-green-400',
    ring: 'ring-green-400 shadow-green-400/50'
  },
  { 
    base: 'emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-400',
    border: 'border-emerald-400',
    ring: 'ring-emerald-400 shadow-emerald-400/50'
  },
  { 
    base: 'yellow-300',
    text: 'text-yellow-300',
    bg: 'bg-yellow-300',
    border: 'border-yellow-300',
    ring: 'ring-yellow-300 shadow-yellow-300/50'
  },
  { 
    base: 'teal-400',
    text: 'text-teal-400',
    bg: 'bg-teal-400',
    border: 'border-teal-400',
    ring: 'ring-teal-400 shadow-teal-400/50'
  },
  { 
    base: 'cyan-400',
    text: 'text-cyan-400',
    bg: 'bg-cyan-400',
    border: 'border-cyan-400',
    ring: 'ring-cyan-400 shadow-cyan-400/50'
  },
  { 
    base: 'amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-400',
    border: 'border-amber-400',
    ring: 'ring-amber-400 shadow-amber-400/50'
  },
  { 
    base: 'chartreuse-400',
    text: 'text-lime-300',
    bg: 'bg-lime-300',
    border: 'border-lime-300',
    ring: 'ring-lime-300 shadow-lime-300/50'
  },
  { 
    base: 'green-300',
    text: 'text-green-300',
    bg: 'bg-green-300',
    border: 'border-green-300',
    ring: 'ring-green-300 shadow-green-300/50'
  },
  { 
    base: 'emerald-300',
    text: 'text-emerald-300',
    bg: 'bg-emerald-300',
    border: 'border-emerald-300',
    ring: 'ring-emerald-300 shadow-emerald-300/50'
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
