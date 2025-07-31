import { useState, useEffect } from "react";
import { useToast } from '@/components/ui/use-toast';
import { useMutation } from "@tanstack/react-query";
import api from "@/integrations/api/client";
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { FabioBoldStyle } from "@/utils/font";
import { useAuthContext } from "@/contexts/AuthContext";

interface BettingVariable {
  id: string;
  name: string;
}

interface BettingRound {
  roundName?: string;
  roundTotalBetsTokenAmount?: number;
  bettingVariables?: BettingVariable[];
  status?: BettingRoundStatus;
}

interface SliderMax {
  freeTokens?: number;
  streamCoins?: number;
}

interface BettingData {
  bettingRounds?: BettingRound[];
  walletFreeToken?: number;
  walletCoin?: number;
  roundTotalBetsTokenAmount:number
  status?: BettingRoundStatus;
  userBetFreeTokens?: number;
  userBetStreamCoins?: number;
}

interface getRoundData {
  betAmount?: number;
  potentialFreeTokenAmt?: number;
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
  isEditing?: boolean; // Optional prop to indicate if it's an editing state
  updatedCurrency?: string; // Optional prop for updated currency type
  lockedBet?: boolean; // Optional prop to indicate if the bet is locked
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
  const [betAmount, setBetAmount] = useState(selectedAmount || 0);
  const [selectedColor, setSelectedColor] = useState("");
  const [sliderMax, setSliderMax] = useState<number | undefined>();
  const isStreamCoins = currency === CurrencyType.STREAM_COINS;
  console.log(session,'session')
  
  const handleColorClick = (color: string) => {
    setSelectedColor(color);
  };

  const isColorButtonsEnabled = betAmount > 0;
  const isBetButtonEnabled = selectedColor !== "";


   useEffect(() => {
    console.log('after edit')
    // if (getRoundData) {
      const isStreamCoins = currency === CurrencyType.STREAM_COINS;
      // setSliderMax(isStreamCoins ? updatedSliderMax?.streamCoins ?? bettingData?.walletCoin 
      //   : updatedSliderMax?.freeTokens ?? bettingData?.walletFreeToken);
         setSliderMax(isStreamCoins ?  Number(bettingData?.walletCoin) + Number(bettingData?.userBetStreamCoins)
        :  Number(bettingData?.walletFreeToken) + Number(bettingData?.userBetFreeTokens));
      setSelectedColor(selectedWinner);
      setBetAmount(updatedCurrency === currency ? selectedAmount : 0);
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAmount,selectedWinner, currency, updatedCurrency, updatedSliderMax,getRoundData]);



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
          Bet <span style={{ color: 'rgba(189,255,0,1)' }} className="text-2xl font-bold sm:text-xl text-base">{betAmount?.toLocaleString('en-US')}</span> {isStreamCoins ? ' Stream Coins' : ' Free Tokens'}
          <span className="ml-3 bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px] max-w-[160px] truncate" title={bettingData?.bettingRounds?.[0]?.roundName}>
          {isStreamCoins
            ? `Avaliable Stream Coins: ${Number(session?.walletBalanceCoin).toLocaleString('en-US')}`
            : `Avaliable Tokens: ${Number(session?.walletBalanceToken).toLocaleString('en-US')}`
          }
            </span>
        </div>
        
        <div className="flex flex-col xs:flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px]">
            Total Pot: {`${totalPot} ${isStreamCoins ? ' Stream Coins' : ' Free Tokens'}`}
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
                description: 'No Tokens available to bet',
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
          // type="number"
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
        {/* Custom Thumb Style with SVG image */}
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


      <div
        className={`grid gap-2 pb-1 ${
          bettingData?.bettingRounds?.[0]?.bettingVariables?.length === 2
            ? 'grid-cols-2' // center the two buttons
            : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {bettingData?.bettingRounds?.[0]?.bettingVariables?.map((option: any, idx: number) => (
          <button
            key={option.id}
            onClick={() => isColorButtonsEnabled && handleColorClick(option.name)}
            className={`flex-1 py-3.5 rounded-[28px] font-medium transition bg-[#242424] text-base sm:text-base text-xs px-2 truncate ${!isColorButtonsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      <div className="relative mx-auto rounded-[16px] shadow-lg p-5" style={{ backgroundColor:'rgba(24, 24, 24, 1)' }}>
                  <div className='all-center flex justify-center items-center h-[100px] mt-8'>
                    <img
                      src="/icons/nobettingData.svg"
                      alt="lock left"
                      className="w-[100%] h-[100%] object-contain"
                    />
                  </div>
                  <p className="text-2xl text-[rgba(255, 255, 255, 1)] text-center pt-4 pb-4" style={FabioBoldStyle}>No betting options available</p>
                </div>
    )}
    </div>
  );
}


