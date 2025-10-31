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

  if (!shouldDisplay) {
    return null;
  }

  return (
    <div className={STATS_CARD_STYLES.CARD}>
      <h2 className={STATS_CARD_STYLES.HEADER}>
        Round: {activeRound.roundName || 'Active Round'}
      </h2>
      
      {/* Stream Coins Section */}
      <div className={STATS_CARD_STYLES.SECTION.container}>
        <p
          className={STATS_CARD_STYLES.TOTAL_POT.text}
          style={{ color: STATS_CARD_STYLES.TOTAL_POT.color }}
        >
          Total Pot: {activeRound.totalSweepCoins.toLocaleString('en-US')} Stream Coins (
          {activeRound.totalBetCountSweepCoin} Picks)
        </p>
        <ul className={STATS_CARD_STYLES.OPTIONS_LIST.container}>
          {activeRound.bettingVariables.map((option) => (
            <li 
              key={`sweep-${option.id}`} 
              className={STATS_CARD_STYLES.OPTIONS_LIST.item}
              style={{ color: STATS_CARD_STYLES.OPTIONS_LIST.itemColor }}
            >
              {option.optionName}: {option.totalBetsSweepCoin.toLocaleString('en-US')} Stream Coins ({option.betCountSweepCoin} Picks)
            </li>
          ))}
        </ul>
      </div>

      {/* Gold Coins Section */}
      <div className={STATS_CARD_STYLES.SECTION.lastContainer}>
        <p
          className={STATS_CARD_STYLES.TOTAL_POT.text}
          style={{ color: STATS_CARD_STYLES.TOTAL_POT.color }}
        >
          Total Pot: {activeRound.totalGoldCoins.toLocaleString('en-US')} Gold Coins (
          {activeRound.totalBetCountGoldCoin} Picks)
        </p>
        <ul className={STATS_CARD_STYLES.OPTIONS_LIST.container}>
          {activeRound.bettingVariables.map((option) => (
            <li 
              key={`gold-${option.id}`} 
              className={STATS_CARD_STYLES.OPTIONS_LIST.item}
              style={{ color: STATS_CARD_STYLES.OPTIONS_LIST.itemColor }}
            >
              {option.optionName}: {option.totalBetsGoldCoin.toLocaleString('en-US')} Gold Coins ({option.betCountGoldCoin} Picks)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
