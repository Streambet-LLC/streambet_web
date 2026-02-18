import { BettingRoundStatus, CurrencyType } from '@/enums';
import type { ActiveRound, UserBet } from '@/contexts/BettingContext';

/**
 * Adapts new context format (ActiveRound) to the prop format expected by BetTokens component.
 * This adapter exists because BetTokens hasn't been refactored yet to use context directly.
 */
export const transformForBetTokens = (activeRound: ActiveRound) => ({
  bettingRounds: [{
    bettingVariables: activeRound.bettingVariables,
    status: activeRound.status,
  }],

  roundTotalBetsCadeCoinAmount: activeRound.totalCadeCoins,
  status: activeRound.status,
  walletCadeCoin: activeRound.walletCadeCoin,
  userBetCadeCoins: activeRound.userBetCadeCoin,
  bettingRoundsWithVariablePercentages: activeRound.bettingRoundsWithVariablePercentages,
});

/**
 * Adapts new context format (UserBet) to the prop format expected by LockTokens component.
 * This adapter exists because LockTokens hasn't been refactored yet to use context directly.
 */
export const transformForLockTokens = (userBet: UserBet) => ({
  betAmount: userBet.amount,
  potentialGoldCoinAmt: userBet.currencyType === CurrencyType.GOLD_COINS ? userBet.potentialWinnings : 0,
  potentialSweepCoinAmt: userBet.currencyType === CurrencyType.SWEEP_COINS ? userBet.potentialWinnings : 0,
  potentialCadeCoinAmt: userBet.currencyType === CurrencyType.CADE_COINS ? userBet.potentialWinnings : 0,
  optionName: userBet.selectedOption,
  betId: userBet.betId || undefined,
  status: userBet.isLocked ? BettingRoundStatus.LOCKED : BettingRoundStatus.OPEN,
});
