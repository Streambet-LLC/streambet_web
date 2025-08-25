import { useState, useEffect, useRef } from "react";
import { useToast } from '@/components/ui/use-toast';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthContext } from "@/contexts/AuthContext";

interface BettingVariable {
  id: string;
  name: string;
}

interface BettingRound {
  roundName?: string;
  roundTotalBetsGoldCoinAmount: number;
  roundTotalBetsSweepCoinAmount: number;
  bettingVariables?: BettingVariable[];
  status?: BettingRoundStatus;
}

interface SliderMax {
  goldCoins?: number;
  sweepCoins?: number;
}

interface BettingData {
  bettingRounds?: BettingRound[];
  walletGoldCoin?: number;
  walletSweepCoin?: number;
  roundTotalBetsGoldCoinAmount: number;
  roundTotalBetsSweepCoinAmount: number;
  status?: BettingRoundStatus;
  userBetGoldCoins?: number;
  userBetSweepCoin?: number;
}

interface getRoundData {
  betAmount?: number;
  potentialGoldCoinAmt?: number;
  optionName?: string;
}

interface BetTokensProps {
  streamId?: string;
  session: any;
  bettingData?: BettingData;
  updatedSliderMax: SliderMax;
  placeBet: (data: { bettingVariableId: string; amount: number; currencyType: string }) => void;
  editBetMutation?: (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => void;
  getRoundData?: getRoundData;
  resetKey?: number;
  totalPot?: number;
  lockedOptions?: boolean;
  loading?: boolean; // Optional prop to indicate loading state
  selectedAmount?: number; // Optional prop for selected amount
  selectedWinner?: string; // Optional prop for selected winner
  isEditing?: boolean; // to indicate if it's an editing state
  updatedCurrency?: string; // for updated currency type
  lockedBet?: boolean; // to indicate if the bet is locked
}

export default function BetTokens({ 
  streamId,
  updatedCurrency,
  updatedSliderMax,
  isEditing,
  loading,
  totalPot,
  selectedAmount,
  selectedWinner, 
  lockedOptions,
  session, 
  bettingData ,
  placeBet,
  getRoundData,
  editBetMutation, 
  resetKey,
  lockedBet
}: BetTokensProps) {
  const { toast } = useToast();
  const { currency } = useCurrencyContext();
  const isMobile = useIsMobile();

  const [betAmount, setBetAmount] = useState(selectedAmount || 0);
  const [selectedColor, setSelectedColor] = useState("");
  const [sliderMax, setSliderMax] = useState<number | undefined>();
  const [isTabletRange, setIsTabletRange] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const isSweepCoins = currency === CurrencyType.SWEEP_COINS;
console.log('session', session);
  // Check for tablet range (773px to 1024px)
  useEffect(() => {
    const checkTabletRange = () => {
      setIsTabletRange(window.innerWidth >= 773 && window.innerWidth <= 1024);
    };
    
    checkTabletRange();
    window.addEventListener('resize', checkTabletRange);
    
    return () => window.removeEventListener('resize', checkTabletRange);
  }, []);

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

  const isColorButtonsEnabled = betAmount > 0;
  const isBetButtonEnabled = selectedColor !== "";

   useEffect(() => {
      const isSweepCoins = currency === CurrencyType.SWEEP_COINS;
      setSliderMax(isSweepCoins ? Number(bettingData?.walletSweepCoin ?? 0) + Number(bettingData?.userBetSweepCoin ?? 0)
        : Number(bettingData?.walletGoldCoin ?? 0) + Number(bettingData?.userBetGoldCoins ?? 0));
      setSelectedColor(selectedWinner);
      setBetAmount(updatedCurrency === currency ? selectedAmount : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAmount,selectedWinner, currency, updatedCurrency, updatedSliderMax,getRoundData, bettingData]);

  // Reset slider and option when resetKey changes
  useEffect(() => {
    if(resetKey !==0){
      setBetAmount(0);
      setSelectedColor("");
    }
  }, [resetKey]);
  
  const handleBet = () => {
    if (lockedOptions) {
      toast({
        variant: 'destructive',
        description: 'Admin has locked the betting round',
      });
      return;
    }
    const selectedOption = bettingData?.bettingRounds?.[0]?.bettingVariables?.find(option => option.name === selectedColor);
    if (!selectedOption) return;

    if (isEditing) {
      editBetMutation({ newBettingVariableId: selectedOption.id, newAmount: betAmount, newCurrencyType: currency });
    }
    else{
      placeBet({ bettingVariableId: selectedOption.id, amount: betAmount, currencyType: currency })
    }
  };


  return (
    <div>
      {(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.OPEN && !lockedBet)  ? (
    <div
      className="rounded-2xl p-4 w-full text-white space-y-4 shadow-lg border text-base sm:text-base text-xs"
      style={{
        background: 'rgba(24, 24, 24, 1)',
        border: '0.62px solid rgba(44, 44, 44, 1)',
        opacity: session == null ? 0.4 : 1,
        pointerEvents: session == null ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col xs:flex-col sm:flex-row items-start sm:items-center justify-between w-full text-xl font-medium sm:text-xl text-sm gap-2">
        <div className="text-[rgba(255,255,255,1)] text-2xl font-bold sm:text-xl text-base">
          Bet <span style={{ color: 'rgba(189,255,0,1)' }} className="text-2xl font-bold sm:text-xl text-base">{betAmount?.toLocaleString('en-US')}</span> {isSweepCoins ? ' Sweep Coins' : ' Gold Coins'}
          <span className="ml-3 bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px] max-w-[160px] truncate" title={bettingData?.bettingRounds?.[0]?.roundName}>
          {isSweepCoins
            ? `Available Sweep Coins: ${Number(session?.walletBalanceSweepCoin || 0).toLocaleString('en-US')}`
            : `Available Gold Coins: ${Number(session?.walletBalanceGoldCoin || 0).toLocaleString('en-US')}`
          }
            </span>
        </div>
        
        <div className="flex flex-col xs:flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px]">
            Total Pot: {`${totalPot} ${isSweepCoins ? ' Sweep Coins' : ' Gold Coins'}`}
            </span>
        </div>
       
      </div>
       <div>
           <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px] max-w-[200px]" title={bettingData?.bettingRounds?.[0]?.roundName}>
            {bettingData?.bettingRounds?.[0]?.roundName}
            </span>
        </div>

      <div className="relative w-full pt-2 pb-2">
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={betAmount}
          disabled={session == null}
          onChange={(e) => {
            if (!lockedOptions) setBetAmount(parseInt(e.target.value));
          }}
          onMouseDown={() => {
            // Use Number(sliderMax) to ensure correct comparison
            if (Number(sliderMax) === 0) {
              toast({
                variant: 'destructive',
                description: 'No coins available to bet',
              });
            }
            if (lockedOptions) {
              toast({
                variant: 'destructive',
                description: 'Admin has locked the betting round',
              });
            }
          }}
          className="w-full h-[25px] appearance-none rounded-full bg-transparent bet-slider-gradient"
          style={{
            MozAppearance: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            border: '0.56px solid rgba(186, 186, 186, 1)'
          }}
        />
         <input
          min={0}
          max={sliderMax}
          value={betAmount}
          disabled={session == null || lockedOptions}
          onChange={e => {
            let value = Number(e.target.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            if (sliderMax !== undefined && value > sliderMax) value = sliderMax;
            setBetAmount(value);
          }}
          className="w-[90px] bg-[#272727] mt-2 px-3 py-2 rounded-lg text-[#FFFFFF] text-sm font-normal border border-[#444]"
  />
        <style>
          {`
            input[type="range"].bet-slider-gradient {
              background: linear-gradient(90deg, #7FFF00 0%, #32CD32 100%);
              background-size: ${(betAmount/(sliderMax||1))*100}% 100%;
              background-repeat: no-repeat;
            }
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              height: 32px;
              width: 32px;
              background: url('/icons/thumb.svg') no-repeat ;
              cursor: pointer;
            }
            input[type="range"]::-moz-range-thumb {
              height: 32px;
              width: 32px;
              background: url('/icons/thumb.svg') no-repeat;
              cursor: pointer;
            }
            input[type="range"]::-ms-thumb {
              height: 32px;
              width: 32px;
              background: url('/icons/thumb.svg') no-repeat;
              cursor: pointer;
            }
            /* Track for Firefox */
            input[type="range"].bet-slider-gradient::-moz-range-progress {
              background: linear-gradient(90deg, #7FFF00 0%, #32CD32 100%);
            }
            input[type="range"].bet-slider-gradient::-moz-range-track {
              background: #242424;
            }
            /* Track for IE */
            input[type="range"].bet-slider-gradient::-ms-fill-lower {
              background: linear-gradient(90deg, #7FFF00 0%, #32CD32 100%);
            }
            input[type="range"].bet-slider-gradient::-ms-fill-upper {
              background: #242424;
            }
          `}
        </style>
      </div>


      <div className="relative">
        <div
          ref={optionsContainerRef}
          className={`${
            isMobile 
              ? 'grid grid-cols-2 gap-2 pb-1 overflow-y-auto max-h-[200px]' 
              : isTabletRange
              ? 'grid grid-cols-2 gap-2 pb-1 overflow-y-auto max-h-[200px]'
              : `grid gap-2 pb-1 ${
                  bettingData?.bettingRounds?.[0]?.bettingVariables?.length === 2
                    ? 'grid-cols-2' // center the two buttons
                    : 'grid-cols-2 sm:grid-cols-4'
                }`
          }`}
        >
          {bettingData?.bettingRounds?.[0]?.bettingVariables?.map((option: any, idx: number) => (
            <button
              key={option.id}
              onClick={() => isColorButtonsEnabled && handleColorClick(option.name)}
              className={`${
                isMobile || isTabletRange
                  ? 'w-full py-3.5 rounded-[28px] font-medium transition bg-[#242424] text-base px-2 truncate' 
                  : 'flex-1 py-3.5 rounded-[28px] font-medium transition bg-[#242424] text-base sm:text-base text-xs px-2 truncate'
              } ${!isColorButtonsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ border: selectedColor === option.name ? '1px solid rgba(189, 255, 0, 1)' : '#242424',
                 color: selectedColor === option.name ? 'rgba(189, 255, 0, 1)' : '#FFFFFF',
               }}
              disabled={!isColorButtonsEnabled}
              title={option.name}
            >
              {option.name}
            </button>
          ))}
        </div>
        
        {/* Scroll indicator */}
        {showScrollIndicator && (isMobile || isTabletRange) && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gradient-to-t from-[#242424] to-transparent h-6 w-full pointer-events-none flex items-center justify-center">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
      </div>

      <button
        className="w-full bg-[#BDFF00] text-black font-bold py-2 rounded-full hover:brightness-105 transition text-lg sm:text-base text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        disabled={!isBetButtonEnabled || betAmount<=0}
        onClick={handleBet}
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5 mr-2 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        ) : null}
        {loading ? 'Placing bet...' : (
          <div className="truncate max-w-[50%] inline-block align-middle px-4" title={selectedColor}>
            {`Bet ${betAmount?.toLocaleString('en-US')} on ${selectedColor}`}
          </div>
        )}
      </button>
    </div>):(

       <div className="h-[220px] relative mx-auto rounded-[16px] shadow-lg border-b border-[#2C2C2C]" style={{ border: '0.62px solid #181818' }}>
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div>
        
          <p className="text-2xl font-bold text-[#FFFFFF] text-center pt-20 pb-4">
             Betting is locked for this round
          </p>
        </div>

        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] pointer-events-none z-0"
          style={{
            background: 'radial-gradient(60% 100% at 50% 100%, rgba(189, 255, 0, 0.25) -140%, transparent 100%)',
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


