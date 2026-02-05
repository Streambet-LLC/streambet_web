import { CurrencyType, BettingRoundStatus, PickMechanism } from '@/enums';
import { useState, useEffect } from 'react';

interface BettingVariable {
  id: string;
  name: string;
}

interface BettingRound {
  id?: string;
  roundName?: string;
  roundTotalBetsGoldCoinAmount?: number;
  bettingVariables?: BettingVariable[];
}

interface BettingData {
  bettingRounds?: BettingRound[];
  walletGoldCoin?: number;
}

interface getRoundData {
  betAmount?: number;
  potentialGoldCoinAmt?: number;
  optionName?: string;
  betId?: string;
  status?: BettingRoundStatus;
}

interface LockTokens {
  updatedBetId?: string;
  bettingData?: BettingData;
  cancelBet: (data: { betId: string; currencyType: string }) => void;
  getRoundData: getRoundData;
  handleBetEdit?: () => void;
  resetKey?: number;
  potentialWinnings?: number;
  selectedWinner?: string;
  selectedAmount?: number;
  socket?: any; // Optional socket connection if needed
  lockedBet?: boolean; // Track if bet is locked
  isStreamScheduled?: boolean;
  updatedCurrency: CurrencyType;
  activeRound?: any; // For accessing mechanism, firstRevealTime, isInitialRevealPeriod
}

export default function LockTokens({
  bettingData,
  socket,
  lockedBet,
  potentialWinnings,
  selectedAmount,
  selectedWinner,
  cancelBet,
  getRoundData,
  updatedBetId,
  handleBetEdit,
  resetKey,
  isStreamScheduled,
  updatedCurrency,
  activeRound,
}: LockTokens) {
  const [localBetAmount, setLocalBetAmount] = useState(selectedAmount || 0);
  const [localOption, setLocalOption] = useState(selectedWinner || '');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [timeUntilReveal, setTimeUntilReveal] = useState('');
  const [isInInitialPeriod, setIsInInitialPeriod] = useState(true);

  useEffect(() => {
    setLocalBetAmount(0);
    setLocalOption('');
  }, [resetKey]);

  useEffect(() => {
    setLocalBetAmount(selectedAmount);
    setLocalOption(selectedWinner);
  }, [selectedAmount, selectedWinner]);

  // Determine if sentiment pick is in initial reveal period (first 24 hours)
  useEffect(() => {
    if (activeRound?.mechanism !== PickMechanism.SENTIMENT) return;

    // Use isInitialRevealPeriod from backend if available
    if (activeRound?.isInitialRevealPeriod !== undefined) {
      setIsInInitialPeriod(activeRound.isInitialRevealPeriod);
    }
  }, [activeRound?.isInitialRevealPeriod, activeRound?.mechanism]);

  // Countdown timer for sentiment picks - ONLY in initial reveal period
  useEffect(() => {
    if (activeRound?.mechanism !== PickMechanism.SENTIMENT || !isInInitialPeriod) return;

    const calculateCountdown = () => {
      const now = new Date();
      let nextReveal = new Date(now);
      nextReveal.setUTCHours(15, 0, 0, 0);

      // If we've already passed 1500 UTC today, set to tomorrow
      if (now.getUTCHours() >= 15) {
        nextReveal.setUTCDate(nextReveal.getUTCDate() + 1);
      }

      const diff = nextReveal.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilReveal(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [activeRound?.mechanism, isInInitialPeriod]);

  const handleCancelBet = () => {
    cancelBet({ betId: updatedBetId || getRoundData?.betId, currencyType: updatedCurrency });
  };

  const handleCancelClick = () => {
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirmation(false);
    handleCancelBet();
  };

  const handleCancelConfirmation = () => {
    setShowCancelConfirmation(false);
  };

  // Sentiment pick layout
  if (activeRound?.mechanism === PickMechanism.SENTIMENT) {
    return (
      <div
        className="relative mx-auto rounded-[16px] shadow-lg border-b border-[#2C2C2C]"
        style={{ border: '0.62px solid #181818' }}
      >
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex-grow flex flex-col justify-center items-center pt-12 px-4 pb-8">
            <p className="text-sm text-[#606060] font-semibold mb-4">Your pick</p>
            <p className="text-5xl sm:text-6xl font-bold text-[#BDFF00] text-center mb-8">
              {localOption}
            </p>

            {isInInitialPeriod ? (
              // Show timer during initial 24-hour reveal period
              <>
                <p className="text-sm text-[#606060] font-semibold mb-2">Reveal in</p>
                <p className="text-2xl font-bold text-white mb-8">{timeUntilReveal}</p>

                <p className="text-sm text-[#606060] font-semibold mb-4">Other Options</p>
                {/* Other options */}
                <div className="flex flex-wrap gap-2 justify-center max-w-sm mb-8">
                  {bettingData?.bettingRounds?.[0]?.bettingVariables
                    ?.filter(option => option.name !== localOption)
                    .map(option => (
                      <div
                        key={option.id}
                        className="bg-[#242424] text-[#D7DFEF] px-4 py-2 rounded-[20px] text-sm font-medium border border-[#2C2C2C]"
                      >
                        {option.name}
                      </div>
                    ))}
                </div>
              </>
            ) : (
              // Show results after initial period with real-time updates
              <>
                <p className="text-sm text-[#606060] font-semibold mb-6">Live Results</p>
                <div className="w-full max-w-sm space-y-3">
                  {bettingData?.bettingRounds?.[0]?.bettingVariables?.map(option => (
                    <div
                      key={option.id}
                      className={`flex items-center justify-between p-3 rounded-[8px] border ${
                        option.name === localOption
                          ? 'bg-[#BDFF00]/10 border-[#BDFF00]/50'
                          : 'bg-[#1a1a1a] border-[#2C2C2C]'
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          option.name === localOption ? 'text-[#BDFF00]' : 'text-[#D7DFEF]'
                        }`}
                      >
                        {option.name}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {option.percentage || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {!lockedBet && (
            <div className="flex justify-center gap-4 pb-8">
              <button
                onClick={handleBetEdit}
                className="bg-[#242424] w-[95px] text-white text-xs font-semibold px-6 py-2 rounded-[28px] hover:bg-[#303030]"
              >
                Edit
              </button>
            </div>
          )}

          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] pointer-events-none z-0"
            style={{
              background:
                'radial-gradient(60% 100% at 50% 100%, rgba(189, 255, 0, 0.25) -140%, transparent 100%)',
            }}
          ></div>
        </div>

        {/* Confirmation Popup */}
        {showCancelConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#242424] rounded-[16px] p-6 max-w-md mx-4 border border-[#2C2C2C]">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Cancel Pick?</h3>
                <p className="text-[#D7DFEF] text-sm">
                  Are you sure you want to cancel your pick? <br />
                  You've got to be in it to win it...
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleCancelConfirmation}
                  className="bg-[#404040] text-white px-6 py-2 rounded-[28px] text-sm font-semibold hover:bg-[#505050] transition-colors"
                >
                  I changed my mind
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="bg-red-600 text-white px-6 py-2 rounded-[28px] text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Confirm cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular pick layout
  return (
    <div
      className="relative mx-auto rounded-[16px] shadow-lg border-b border-[#2C2C2C]"
      style={{ border: '0.62px solid #181818' }}
    >
      <div
        className={`relative z-10 h-full flex flex-col justify-between ${lockedBet ? 'pb-20' : ''}`}
      >
        <div>
          <div className="bg-[#242424] flex flex-col sm:flex-row sm:justify-between items-center rounded-t-2xl p-3 sm:p-5 px-[20px] sm:px-[55px] pr-[20px] sm:pr-[55px] gap-3 sm:gap-4 text-center">
            <div className="flex-shrink-0 w-full sm:w-auto">
              <p className="text-xs text-[#606060] font-semibold text-center pb-1">
                {activeRound?.mechanism === PickMechanism.SENTIMENT ? 'Your pick' : 'Your pick'}
              </p>
              <p className="font-medium text-sm sm:text-[16px] text-[#D7DFEF]">
                {activeRound?.mechanism === PickMechanism.SENTIMENT
                  ? localOption
                  : `${Number(localBetAmount)?.toLocaleString('en-US')} CadeCoins`}
              </p>
            </div>
            {activeRound?.mechanism !== PickMechanism.SENTIMENT && (
              <>
                <div className="flex-1 sm:min-w-0 w-full border-t sm:border-t-0 sm:border-1 border-[#2C2C2C] pt-3 sm:pt-0 sm:pl-4">
                  <p className="text-xs text-[#606060] font-semibold text-center pb-1">
                    Selected winner
                  </p>
                  <p
                    className="font-medium text-sm sm:text-[16px] text-[#D7DFEF] text-center break-words"
                    title={localOption}
                  >
                    {localOption}
                  </p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto border-t sm:border-t-0 sm:border-1 border-[#2C2C2C] pt-3 sm:pt-0 sm:pl-4">
                  <p className="text-xs text-[#606060] font-semibold text-center pb-1">
                    Current Payout:
                  </p>
                  <p className="font-medium text-sm sm:text-[16px] text-[#BDFF00] text-center">
                    {Number(potentialWinnings ?? 0) > 0
                      ? Number(Math.round(Number(potentialWinnings ?? 0))).toLocaleString('en-US')
                      : 'No Picks on the other side yet'}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <p className="text-2xl font-bold text-[#FFFFFF] text-center pt-14 pb-4">
              {lockedBet
                ? 'Picks are locked. Good luck!'
                : 'Open picks will close just before event start'}
            </p>
          </div>
        </div>
        {!lockedBet && (
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={handleCancelClick}
              className="bg-[#242424] w-[95px] text-white px-6 py-2 rounded-[28px] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleBetEdit}
              className="bg-[#242424] w-[95px] text-white text-xs font-semibold px-6 py-2 rounded-[28px]"
            >
              Edit
            </button>
          </div>
        )}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 100%, rgba(189, 255, 0, 0.25) -140%, transparent 100%)',
          }}
        ></div>
      </div>
      {lockedBet && (
        <>
          <img
            src="/icons/lock1.svg"
            alt="lock left"
            className="absolute top-20  left-0 w-[220px] h-[180px]"
          />
          <img
            src="/icons/lock2.svg"
            alt="lock right"
            className="absolute bottom-9 right-0 w-[100px] h-auto"
          />
        </>
      )}

      {/* Confirmation Popup */}
      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#242424] rounded-[16px] p-6 max-w-md mx-4 border border-[#2C2C2C]">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Cancel Pick?</h3>
              <p className="text-[#D7DFEF] text-sm">
                Are you sure you want to cancel your pick? <br />
                You've got to be in it to win it...
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancelConfirmation}
                className="bg-[#404040] text-white px-6 py-2 rounded-[28px] text-sm font-semibold hover:bg-[#505050] transition-colors"
              >
                I changed my mind
              </button>
              <button
                onClick={handleConfirmCancel}
                className="bg-red-600 text-white px-6 py-2 rounded-[28px] text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
