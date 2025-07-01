import { useState, useEffect } from "react";
import { useToast } from '@/components/ui/use-toast';
import { useMutation } from "@tanstack/react-query";
import api from "@/integrations/api/client";
import { CurrencyType } from '@/enums';

interface BettingVariable {
  id: string;
  name: string;
}

interface BettingRound {
  roundName?: string;
  roundTotalBetsTokenAmount?: number;
  bettingVariables?: BettingVariable[];
}

interface BettingData {
  bettingRounds?: BettingRound[];
  walletFreeToken?: number;
  roundTotalBetsTokenAmount:number
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
  placeBet: (data: { bettingVariableId: string; amount: number; currencyType: string }) => void;
  editBetMutation?: (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => void;
  getRoundData?: getRoundData;
}

export default function BetTokens({ streamId, session, bettingData ,placeBet,getRoundData,editBetMutation}: BetTokensProps) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(getRoundData?.betAmount || 0);
  const [selectedColor, setSelectedColor] = useState("");


  const handleColorClick = (color: string) => {
    setSelectedColor(color);
  };

  const isColorButtonsEnabled = betAmount > 0;
  const isBetButtonEnabled = selectedColor !== "";
  const sliderMax = bettingData?.walletFreeToken ?? 0;


   useEffect(() => {
    if (getRoundData) {
      setSelectedColor(getRoundData.optionName);
      setBetAmount(getRoundData.betAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRoundData]);
  

  console.log(betAmount,'betAmount')

  const handleBet = () => {
    const selectedOption = bettingData?.bettingRounds?.[0]?.bettingVariables?.find(option => option.name === selectedColor);
    if (!selectedOption) return;

    if (getRoundData?.betAmount) {
      editBetMutation({ newBettingVariableId: selectedOption.id, newAmount: betAmount, newCurrencyType: CurrencyType.FREE_TOKENS });
    }
    else{
      placeBet({ bettingVariableId: selectedOption.id, amount: betAmount, currencyType: CurrencyType.FREE_TOKENS });
    }
  };

 

  return (
    <div
      className="bg-[rgba(24, 24, 24, 1)] rounded-2xl p-4 w-full text-white space-y-4 shadow-lg border text-base sm:text-base text-xs"
      style={{
        border: '0.62px solid rgba(44, 44, 44, 1)',
        opacity: session == null ? 0.4 : 1,
        pointerEvents: session == null ? 'none' : 'auto',
      }}
    >

      <div className="flex flex-col xs:flex-col sm:flex-row items-start sm:items-center justify-between w-full text-xl font-medium sm:text-xl text-sm gap-2">
        <div className="text-[rgba(255,255,255,1)] text-2xl font-bold sm:text-xl text-base">
          Bet <span style={{ color: 'rgba(189,255,0,1)' }} className="text-2xl font-bold sm:text-xl text-base">{betAmount}</span> Free Tokens
        </div>
        <div className="flex flex-col xs:flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px]">
            {bettingData?.bettingRounds?.[0]?.roundName}
            </span>
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px]">
            Total Pot: {bettingData?.roundTotalBetsTokenAmount ? bettingData?.roundTotalBetsTokenAmount : 0} Free Tokens
            </span>
        </div>
      </div>

      <div className="relative w-full pt-2 pb-2">
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={betAmount}
          disabled={session == null}
          onChange={(e) => setBetAmount(parseInt(e.target.value))}
          onMouseDown={() => {
            if (sliderMax === 0) {
              toast({
                variant: 'destructive',
                description: 'No Tokens available to bet',
              });
            }
          }}
          className="w-full h-[25px] appearance-none rounded-full bg-transparent"
          style={{
            // Hide default thumb for Firefox
            MozAppearance: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            border: '0.56px solid rgba(186, 186, 186, 1)'
          }}
        />
        {/* Custom Thumb Style with SVG image */}
        <style>
          {`
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
          `}
        </style>
      </div>


      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-1">
        {bettingData?.bettingRounds?.[0]?.bettingVariables?.map((option: any, idx: number) => (
          <button
            key={option.id}
            onClick={() => isColorButtonsEnabled && handleColorClick(option.name)}
            className={`flex-1 py-3.5 rounded-[28px] font-medium transition bg-[#242424] text-base sm:text-base text-xs ${!isColorButtonsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ border: selectedColor === option.name ? '1px solid rgba(189, 255, 0, 1)' : '#242424',
               color: selectedColor === option.name ? 'rgba(189, 255, 0, 1)' : '#FFFFFF',
             }}
            disabled={!isColorButtonsEnabled}
          >
            {option.name}
          </button>
        ))}
      </div>

      <button
        className="w-full bg-[#BDFF00] text-black font-bold py-2 rounded-full hover:brightness-105 transition text-lg sm:text-base text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isBetButtonEnabled || betAmount<=0}
        onClick={handleBet}
      >
        Bet {betAmount} on {selectedColor}
      </button>
    </div>
  );
}


