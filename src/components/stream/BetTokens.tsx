import { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { BettingRoundStatus, PickMechanism } from '@/enums';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  calculatePresetAmounts,
  validateBetAmount,
  percentageToAmount,
  getSliderBackground,
} from '@/utils/bet-slider-helpers';

interface BettingVariable {
  id: string;
  name: string;
}

interface BettingRound {
  roundName?: string;
  bettingVariables?: BettingVariable[];
  status?: BettingRoundStatus;
  mechanism?: PickMechanism;
}

interface BettingData {
  bettingRounds?: BettingRound[];
  bettingRoundsWithVariablePercentages: {
    bettingVariables: {
      percentage: string | number;
    };
  }[];
  walletCadeCoin?: number;
  roundTotalBetsCadeCoinAmount: number;
  status?: BettingRoundStatus;
  userBetCadeCoins?: number;
  mechanism?: PickMechanism;
}

interface BetTokensProps {
  session: any;
  bettingData?: BettingData;
  placeBet: (data: { bettingVariableId: string; amount: number; currencyType: string }) => void;
  editBetMutation?: (data: {
    newBettingVariableId: string;
    newAmount: number;
    newCurrencyType: string;
  }) => void;
  resetKey?: number;
  totalPot?: number;
  lockedOptions?: boolean;
  loading?: boolean; // Optional prop to indicate loading state
  selectedAmount?: number; // Optional prop for selected amount
  selectedWinner?: string; // Optional prop for selected winner
  isEditing?: boolean; // to indicate if it's an editing state
  updatedCurrency?: string; // for updated currency type
  lockedBet?: boolean; // to indicate if the bet is locked
  handleEditBack: VoidFunction;
  selectedOption: string | null;
  activeRound?: any; // For accessing mechanism and other round properties
}

export default function BetTokens({
  updatedCurrency,
  isEditing,
  loading,
  totalPot,
  selectedAmount,
  selectedWinner,
  lockedOptions,
  session,
  bettingData,
  placeBet,
  editBetMutation,
  resetKey,
  lockedBet,
  handleEditBack,
  selectedOption,
  activeRound,
}: BetTokensProps) {
  const { toast } = useToast();
  const { currency } = useCurrencyContext();
  const { getBettingLimits } = useAuthContext();
  const bettingLimits = getBettingLimits();
  const isMobile = useIsMobile();

  // Determine if this is a sentiment pick
  const isSentimentPick = activeRound?.mechanism === PickMechanism.SENTIMENT;

  const [betAmount, setBetAmount] = useState(selectedAmount || 0);
  const [selectedColor, setSelectedColor] = useState(selectedOption ? selectedOption : '');
  const [sliderMax, setSliderMax] = useState<number | undefined>();
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const optionsContainerRef = useRef<HTMLDivElement>(null);

  // Check if scroll is needed
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (optionsContainerRef.current) {
        const { scrollHeight, clientHeight } = optionsContainerRef.current;
        setShowScrollIndicator(scrollHeight > clientHeight);
      }
    };

    // Check after a short delay to ensure DOM is updated
    const timer = setTimeout(checkScrollNeeded, 100);
    return () => clearTimeout(timer);
  }, [bettingData?.bettingRounds?.[0]?.bettingVariables]);

  const handleColorClick = (color: string) => {
    setSelectedColor(color);
  };

  const isColorButtonsEnabled = isSentimentPick || betAmount > 0 || selectedOption !== null;
  const isBetButtonEnabled = selectedColor !== '';

  useEffect(() => {
    const maxBetLimit = bettingLimits.maxCadeCoinsBet;

    const currentBetAmount = isEditing ? Number(bettingData?.userBetCadeCoins) || 0 : 0;

    const walletBalance = Number(bettingData?.walletCadeCoin) || 0;

    // Calculate maximum bet amount allowing decimals
    setSliderMax(Math.min(walletBalance + currentBetAmount, maxBetLimit));

    // Only set selectedColor if selectedWinner exists in current round's options
    const optionExists = bettingData?.bettingRounds?.[0]?.bettingVariables?.some(
      option => option.name === selectedWinner
    );
    setSelectedColor(
      optionExists && selectedWinner ? selectedWinner : selectedOption ? selectedOption : ''
    );

    setBetAmount(updatedCurrency === currency ? selectedAmount : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAmount,
    selectedWinner,
    currency,
    updatedCurrency,
    bettingData,
    session,
    isEditing,
  ]);

  // Reset slider and option when resetKey changes
  useEffect(() => {
    if (resetKey !== 0) {
      setBetAmount(0);
      setSelectedColor('');
    }
  }, [resetKey]);

  const handleBet = () => {
    if (lockedOptions) {
      toast({
        variant: 'destructive',
        description: 'Admin has locked the round',
      });
      return;
    }
    const selectedOption = bettingData?.bettingRounds?.[0]?.bettingVariables?.find(
      option => option.name === selectedColor
    );
    if (!selectedOption) return;

    if (isEditing) {
      editBetMutation({
        newBettingVariableId: selectedOption.id,
        newAmount: betAmount,
        newCurrencyType: currency,
      });
    } else {
      placeBet({ bettingVariableId: selectedOption.id, amount: betAmount, currencyType: currency });
    }
  };

  // Check if wallet balance is 0. bettingData is source of truth with slider logic
  const walletBalance = useMemo(
    () => Number(bettingData?.walletCadeCoin) || 0,
    [bettingData?.walletCadeCoin]
  );

  // Check if betting is available. Round is open, not locked
  const isBettingAvailable =
    bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.OPEN && !lockedBet;

  // Show zero balance message when user has 0 balance, or switches to different currency with 0 balance
  const hasZeroBalance =
    session != null &&
    bettingData != null &&
    isBettingAvailable &&
    walletBalance === 0 &&
    (!isEditing || (isEditing && updatedCurrency !== currency));

  return (
    <div>
      {/* Zero Balance Message */}
      {hasZeroBalance ? (
        <div className="bg-dark-bg p-4 rounded-[16px] flex flex-col items-center space-y-3 w-full mx-auto">
          <h2 className="text-white text-lg font-semibold">Your wallet balance is 0</h2>
          <p className="text-gray-400 text-sm text-center">You need CadeCoins to place a pick</p>
        </div>
      ) : isBettingAvailable ? (
        <div
          className="rounded-2xl p-4 w-full text-white space-y-4 shadow-lg border text-xs sm:text-base"
          style={{
            background: 'var(--dark-bg)',
            border: '0.62px solid var(--dark-border)',
            opacity: session == null ? 0.4 : 1,
            pointerEvents: session == null ? 'none' : 'auto',
          }}
        >
          {/* Back button row */}
          {isEditing && (
            <div
              className="w-[18px] h-[18px] gap-2 flex items-center cursor-pointer mb-2"
              onClick={() => handleEditBack()}
            >
              <img
                src="/icons/back.svg"
                className="w-[100%] h-[100%] object-contain cursor-pointer"
              />
              <span className="font-medium">Back</span>
            </div>
          )}

          <div className="flex flex-col xs:flex-col sm:flex-row items-start sm:items-center justify-between w-full text-sm font-medium sm:text-xl gap-2">
            {isSentimentPick ? (
              <div className="text-white text-base font-bold sm:text-xl md:text-2xl">
                Earn CadeCoins for Sharing Picks
              </div>
            ) : (
              <div className="text-white text-base font-bold sm:text-xl md:text-2xl">
                Pick{' '}
                <span
                  className="text-electric-lime text-base font-bold sm:text-xl md:text-2xl"
                >
                  {betAmount?.toLocaleString('en-US')}
                </span>{' '}
                CadeCoins
                <span
                  className="ml-3 bg-dark-surface rounded-[28px] px-4 py-2 text-white text-[10px] font-normal sm:text-xs max-w-[160px] truncate"
                  title={bettingData?.bettingRounds?.[0]?.roundName}
                >
                  Available CadeCoins:{' '}
                  {Number(session?.walletBalanceCadeCoin || 0).toLocaleString('en-US')}
                </span>
              </div>
            )}

            {!isSentimentPick && (
              <div className="flex flex-col xs:flex-col sm:flex-row gap-2 sm:w-auto">
                <span className="bg-dark-surface rounded-[28px] px-4 py-2 text-white text-[10px] font-normal sm:text-xs">
                  Total Pot: {`${totalPot} CadeCoins`}
                </span>
              </div>
            )}
          </div>

          {!isSentimentPick ? (
            <div className="relative w-full pt-2 pb-2">
              {/* Number input and slider row */}
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={0}
                  max={sliderMax}
                  step={1}
                  value={betAmount}
                  disabled={session == null || lockedOptions}
                  onFocus={e => {
                    e.target.select();
                  }}
                  onChange={e => {
                    const value = validateBetAmount(e.target.value, sliderMax || 0);
                    if (value !== null) {
                      setBetAmount(value);
                    }
                  }}
                  className="w-[90px] bg-input-bg px-3 py-2 rounded-lg text-white text-sm font-normal border border-input-border"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                  } as React.CSSProperties}
                />

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={sliderMax > 0 ? (betAmount / sliderMax) * 100 : 0}
                  disabled={session == null}
                  onChange={e => {
                    if (!lockedOptions && sliderMax) {
                      setBetAmount(percentageToAmount(Number(e.target.value), sliderMax));
                    }
                  }}
                  onMouseDown={() => {
                    if (Number(sliderMax) === 0) {
                      toast({
                        variant: 'destructive',
                        description: 'No coins available to Pick',
                      });
                    }
                    if (lockedOptions) {
                      toast({
                        variant: 'destructive',
                        description: 'Admin has locked the round',
                      });
                    }
                  }}
                  className="flex-1 h-[25px] rounded-full"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: getSliderBackground(betAmount, sliderMax || 0),
                    border: '0.56px solid var(--slider-border)',
                  } as React.CSSProperties}
                />
              </div>

              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  width: 32px;
                  height: 32px;
                  background: url('/icons/thumb.svg') no-repeat center;
                  cursor: pointer;
                }
                input[type="range"]::-moz-range-thumb {
                  width: 32px;
                  height: 32px;
                  background: url('/icons/thumb.svg') no-repeat center;
                  border: none;
                  cursor: pointer;
                }
              `}</style>

              {/* Preset Amount Buttons row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
                {calculatePresetAmounts({
                  maxBetLimit: bettingLimits.maxCadeCoinsBet,
                  walletBalance: Number(session?.walletBalanceCadeCoin) || 0,
                  currentBetAmount: isEditing ? Number(bettingData?.userBetCadeCoins) || 0 : 0,
                }).map(({ percentage, value }) => (
                  <button
                    key={`${percentage}-${value}`}
                    onClick={() =>
                      session && !lockedOptions && setBetAmount(Math.min(value, sliderMax || 0))
                    }
                    disabled={session == null || lockedOptions}
                    className="bg-electric-lime text-black border-electric-lime hover:bg-electric-lime-hover hover:border-electric-lime-hover text-xs py-2 px-2 rounded-md font-medium min-h-[36px] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {value} tokens
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300 font-semibold">Sentiment Pick Rewards</p>
                <ul className="text-xs text-blue-200 mt-2 space-y-1">
                  <li>
                    • <span className="font-semibold text-electric-lime">10 CadeCoins</span> - if you
                    vote within 2 hours of the 1500 UTC cycle
                  </li>
                  <li>
                    • <span className="font-semibold text-electric-lime">5 CadeCoins</span> - if you
                    vote anytime after that
                  </li>
                  <li>
                    • <span className="font-semibold text-blue-300">No rewards</span> - for edited
                    votes
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="relative">
            <div
              ref={optionsContainerRef}
              className={`${
                isMobile
                  ? 'grid grid-cols-2 gap-2 pb-1 overflow-y-auto max-h-[200px]'
                  : `grid gap-2 pb-1 ${
                      bettingData?.bettingRounds?.[0]?.bettingVariables?.length === 2
                        ? 'grid-cols-2' // center the two buttons
                        : 'grid-cols-2 sm:grid-cols-4'
                    }`
              }`}
            >
              {bettingData?.bettingRounds?.[0]?.bettingVariables?.map(
                (option: any, idx: number) => (
                  <div
                    key={option.id}
                    onClick={() => isColorButtonsEnabled && handleColorClick(option.name)}
                    className={`flex justify-between cursor-pointer ${
                      isMobile
                        ? 'w-full py-3.5 rounded-[28px] font-medium transition bg-dark-surface text-base px-2 break-words whitespace-normal'
                        : 'flex-1 py-3.5 rounded-[28px] font-medium transition bg-dark-surface text-xs sm:text-base px-2 break-words whitespace-normal'
                    } ${!isColorButtonsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                      border:
                        selectedColor === option.name
                          ? '1px solid var(--electric-lime)'
                          : '1px solid transparent',
                      color: selectedColor === option.name ? 'var(--electric-lime)' : 'white',
                    }}
                    title={option.name}
                  >
                    {option.name}
                    {!isSentimentPick && (
                      <span>
                        {
                          bettingData.bettingRoundsWithVariablePercentages[0].bettingVariables[idx]
                            .percentage
                        }
                        %
                      </span>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Scroll indicator */}
            {showScrollIndicator && isMobile && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gradient-to-t from-dark-surface to-transparent h-6 w-full pointer-events-none flex items-center justify-center">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <button
            className="w-full bg-electric-lime text-black font-bold py-2 rounded-full hover:brightness-105 transition text-xs sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!isBetButtonEnabled || (betAmount <= 0 && !isSentimentPick)}
            onClick={handleBet}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-black"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            ) : null}
            {loading ? (
              'Placing pick...'
            ) : (
              <div
                className="break-words whitespace-normal w-full text-center px-4"
                title={selectedColor}
              >
                {!selectedColor || (betAmount === 0 && !isSentimentPick)
                  ? 'Make Your Pick'
                  : isSentimentPick
                    ? `Pick ${selectedColor}`
                    : `Pick ${betAmount?.toLocaleString('en-US')} on ${selectedColor}`}
              </div>
            )}
          </button>
        </div>
      ) : (
        <div
          className="h-[220px] relative mx-auto rounded-[16px] shadow-lg border-b border-dark-border"
          style={{ border: '0.62px solid var(--dark-bg)' }}
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <p className="text-2xl font-bold text-white text-center pt-20 pb-4">
                Picks are locked for this round
              </p>
            </div>

            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] pointer-events-none z-0"
              style={{
                background:
                  'radial-gradient(60% 100% at 50% 100%, var(--electric-lime-glow) -140%, transparent 100%)',
              }}
            ></div>
          </div>

          <>
            <img
              src="/icons/lock1.svg"
              alt="lock left"
              className="absolute top-10  left-0 w-[120px] sm:w-[220px] h-[180px] "
            />
            <img
              src="/icons/lock2.svg"
              alt="lock right"
              className="absolute bottom-9 right-0 w-[80px] sm:w-[100px] h-auto"
            />
          </>
        </div>
      )}
    </div>
  );
}
