import { useMemo } from 'react';
import { useBettingContext } from '@/contexts/BettingContext';

// Styling constants
const STATS_CARD_STYLES = {
  CARD: 'border p-4 border-zinc-700 rounded-[16px]',
  HEADER: 'text-lg font-semibold leading-tight pt-2 pb-2',
  SECTION: {
    container: 'mb-4',
    lastContainer: '',
  },
  TOTAL_POT: {
    text: 'text-sm font-semibold leading-tight pt-2 pb-2',
    color: '#BDFF00',
  },
  OPTIONS_LIST: {
    container: 'mt-2 ml-5',
    item: 'text-sm',
    itemColor: 'rgba(96, 96, 96, 1)',
  },
} as const;

// Type definitions for CurrencySection
interface CurrencyOption {
  id: string;
  optionName: string;
  totalBets: number;
  betCount: number;
}

interface CurrencySectionProps {
  type: 'sweep' | 'gold';
  currencyName: string;
  totalCoins: number;
  totalBets: number;
  options: CurrencyOption[];
  isLast?: boolean;
}

/**
 * CurrencySection - Reusable component for displaying betting statistics per currency
 * 
 * Renders total pot and per-option breakdown for a single currency type
 */
const CurrencySection = ({ 
  type, 
  currencyName, 
  totalCoins, 
  totalBets, 
  options, 
  isLast = false 
}: CurrencySectionProps) => {
  return (
    <div className={isLast ? STATS_CARD_STYLES.SECTION.lastContainer : STATS_CARD_STYLES.SECTION.container}>
      <p
        className={STATS_CARD_STYLES.TOTAL_POT.text}
        style={{ color: STATS_CARD_STYLES.TOTAL_POT.color }}
      >
        Total Pot: {totalCoins.toLocaleString('en-US')} {currencyName} (
        {totalBets} Picks)
      </p>
      <ul className={STATS_CARD_STYLES.OPTIONS_LIST.container}>
        {options.map((option) => (
          <li 
            key={`${type}-${option.id}`} 
            className={STATS_CARD_STYLES.OPTIONS_LIST.item}
            style={{ color: STATS_CARD_STYLES.OPTIONS_LIST.itemColor }}
          >
            {option.optionName}: {option.totalBets.toLocaleString('en-US')} {currencyName} ({option.betCount} Picks)
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * BettingRoundStatsCard - Displays betting statistics for the active round
 * 
 * Shows both currency types (Stream Coins and Gold Coins) with:
 * - Total pot amount and total bet count for each currency
 * - Per-option breakdown showing individual amounts and pick counts
 * 
 * Consumes data from BettingContext (no prop drilling needed)
 */
export const BettingRoundStatsCard = () => {
  const { activeRound } = useBettingContext();

  // Check if we should display the card
  const shouldDisplay = useMemo(() => {
    if (!activeRound || !activeRound.bettingVariables) return false;
    
    // Only show if there's at least one betting variable (option)
    return activeRound.bettingVariables.length > 0;
  }, [activeRound]);

  // Map betting variables to Stream Coins options
  const sweepCoinOptions = useMemo(() => 
    (activeRound?.bettingVariables ?? []).map(option => ({
      id: option.id,
      optionName: option.optionName,
      totalBets: option.totalBetsSweepCoin,
      betCount: option.betCountSweepCoin,
    })),
    [activeRound?.bettingVariables]
  );

  // Map betting variables to Gold Coins options
  const goldCoinOptions = useMemo(() => 
    (activeRound?.bettingVariables ?? []).map(option => ({
      id: option.id,
      optionName: option.optionName,
      totalBets: option.totalBetsGoldCoin,
      betCount: option.betCountGoldCoin,
    })),
    [activeRound?.bettingVariables]
  );

  if (!shouldDisplay) {
    return null;
  }

  return (
    <div className={STATS_CARD_STYLES.CARD}>
      <h2 className={STATS_CARD_STYLES.HEADER}>
        Round: {activeRound.roundName || 'Active Round'}
      </h2>
      
      {/* Stream Coins Section */}
      <CurrencySection
        type="sweep"
        currencyName="Stream Coins"
        totalCoins={activeRound.totalSweepCoins}
        totalBets={activeRound.totalBetCountSweepCoin}
        options={sweepCoinOptions}
      />

      {/* Gold Coins Section */}
      <CurrencySection
        type="gold"
        currencyName="Gold Coins"
        totalCoins={activeRound.totalGoldCoins}
        totalBets={activeRound.totalBetCountGoldCoin}
        options={goldCoinOptions}
        isLast
      />
    </div>
  );
};
