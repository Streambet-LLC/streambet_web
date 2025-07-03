import { CurrencyType, BettingRoundStatus } from "@/enums";
import { useState, useEffect } from "react";

interface BettingVariable {
  id: string;
  name: string;
}

interface BettingRound {
  id?: string;
  roundName?: string;
  roundTotalBetsTokenAmount?: number;
  bettingVariables?: BettingVariable[];
}

interface BettingData {
  bettingRounds?: BettingRound[];
  walletFreeToken?: number;
}

interface getRoundData {
  betAmount?: number;
  potentialFreeTokenAmt?: number;
  optionName?: string;
  betId?: string;
  status?: BettingRoundStatus;
}

interface LockTokens {
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
}

export default function LockTokens({ bettingData ,socket,lockedBet,potentialWinnings,selectedAmount,selectedWinner,cancelBet,getRoundData,handleBetEdit, resetKey}: LockTokens) {
  const [localBetAmount, setLocalBetAmount] = useState(selectedAmount || 0);
  const [localOption, setLocalOption] = useState(selectedWinner || "");

  useEffect(() => {
    setLocalBetAmount(0);
    setLocalOption("");
  }, [resetKey]);

  useEffect(() => {
    setLocalBetAmount(selectedAmount);
    setLocalOption(selectedWinner);
  }, [selectedAmount, selectedWinner,getRoundData]);

   const handleCancelBet = () => {
    cancelBet({ betId: getRoundData?.betId,currencyType: CurrencyType.FREE_TOKENS });
    };


  return (
    <div className="h-[250px] relative mx-auto rounded-[16px] shadow-lg border-b border-[#2C2C2C]" style={{ border: '0.62px solid #181818' }}>
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div>
          <div className="bg-[#242424] flex justify-between items-center rounded-t-2xl p-5 pl-[55px] pr-[55px]">
            <div>
              <p className="text-xs text-[#606060] font-semibold text-center pb-1">Your bet</p>
              <p className="font-medium text-[16px] text-[#D7DFEF]">{localBetAmount} tokens</p>
            </div>
            <div>
              <p className="text-xs text-[#606060] font-semibold text-center pb-1">Selected winner</p>
              <p className="font-medium text-[16px] text-[#D7DFEF] text-center">{localOption}</p>
            </div>
            <div>
              <p className="text-xs text-[#606060] font-semibold text-center pb-1">Potential winnings:</p>
              <p className="font-medium text-[16px] text-[#BDFF00] text-center">${Math.round(potentialWinnings?? 0)}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-[#FFFFFF] text-center pt-14 pb-4">
            {lockedBet ? 'Bets are locked. Good luck!' : 'Bets will be locked soon'}
          </p>
        </div>
        {!lockedBet && (
          <div className="flex justify-center gap-4 mb-8">
            <button 
              onClick={handleCancelBet}
              className="bg-[#242424] w-[95px] text-white px-6 py-2 rounded-[28px] text-xs font-semibold">
              Cancel
            </button>
            <button
              onClick={handleBetEdit}
              className="bg-[#242424] w-[95px] text-white text-xs font-semibold px-6 py-2 rounded-[28px]">
              Edit
            </button>
          </div>
        )}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(189, 255, 0, 0.25) 0%, transparent 70%)',
          }}
        ></div>
      </div>
      {lockedBet && (
        <>
          <img
            src="/icons/lock1.svg"
            alt="lock left"
            className="absolute top-20  left-0 w-[220px] h-[180px] z-10"
          />
          <img
            src="/icons/lock2.svg"
            alt="lock right"
            className="absolute bottom-9 right-0 w-[100px] h-auto z-10"
          />
        </>
      )}
    </div>
  );
}
