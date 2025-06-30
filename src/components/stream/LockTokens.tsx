import { CurrencyType } from "@/enums";
import { console } from "inspector";
import { useState } from "react";

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

interface LockTokens {
  bettingData?: BettingData;
  cancelBet: (data: { betId: string; currencyType: string }) => void;
}

export default function LockTokens({ bettingData ,cancelBet}: LockTokens) {

  // console.log(bettingData?.bettingRounds[0]?.id, 'bettingData inside LockTokens');

   const handleCancelBet = () => {
    cancelBet({ betId: bettingData?.bettingRounds[0]?.id,currencyType: CurrencyType.FREE_TOKENS });
    };

  return (
    <div className="relative mx-auto rounded-[16px] shadow-lg border-b border-[#2C2C2C]" style={{ border: '0.62px solid #181818' }}>
      
            <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[200px] pointer-events-none z-0"
        style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(189, 255, 0, 0.25) 0%, transparent 70%)',
        }}
        ></div>

          <img
              src="/icons/lock1.svg"
              alt="lock left"
              className="absolute top-8  left-0 w-[230px] h-auto z-10"
            />

            <img
              src="/icons/lock2.svg"
              alt="lock right"
              className="absolute bottom-9 right-0 w-[100px] h-auto z-10"
            />


      <div className="relative z-10">
        <div className="bg-[#242424] flex justify-between items-center rounded-t-2xl p-5 pl-[55px] pr-[55px]">
          <div>
            <p className="text-xs text-[#606060] font-semibold text-center pb-1">Your bet</p>
            <p className="font-medium text-[16px] text-[#D7DFEF]">540 tokens</p>
          </div>
          <div>
            <p className="text-xs text-[#606060] font-semibold text-center pb-1">Selected winner</p>
            <p className="font-medium text-[16px] text-[#D7DFEF] text-center">Pink</p>
          </div>
          <div>
            <p className="text-xs text-[#606060] font-semibold text-center pb-1">Potential winnings:</p>
            <p className="font-medium text-[16px] text-[#BDFF00] text-center">$14,322.10</p>
          </div>
        </div>

        {/* <div
        className="relative"
        style={{
          backgroundImage: `url('/icons/lock_bg.svg')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          height: '220px',
        }}
      > */}

        <p className="text-2xl font-bold text-[#FFFFFF] text-center pt-14 pb-4">Bets will be locked soon</p>

        <div className="flex justify-center gap-4 mb-8">
          <button 
          onClick={handleCancelBet}
          className="bg-[#242424] w-[95px] text-white px-6 py-2 rounded-[28px] text-xs font-semibold">
            Cancel
          </button>
          <button className="bg-[#242424] w-[95px] text-white text-xs font-semibold px-6 py-2 rounded-[28px]">
            Edit
          </button>
        </div>
        {/* </div> */}
      </div>
    </div>
  );
}
