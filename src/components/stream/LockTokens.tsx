import { CurrencyType, BettingRoundStatus } from "@/enums";
import { useState, useEffect, useRef } from "react";

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
}: LockTokens) {
  const [localBetAmount, setLocalBetAmount] = useState(selectedAmount || 0);
  const [localOption, setLocalOption] = useState(selectedWinner || "");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  // measure header height
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => setHeaderH(el.getBoundingClientRect().height);

    update();

    // watch for size changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, [localBetAmount, localOption, potentialWinnings, lockedBet]);

  useEffect(() => {
    setLocalBetAmount(0);
    setLocalOption("");
  }, [resetKey]);

  useEffect(() => {
    setLocalBetAmount(selectedAmount);
    setLocalOption(selectedWinner);
  }, [selectedAmount, selectedWinner]);

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

  return (
    <div
      className="min-h-[260px] relative w-full max-w-6xl mx-auto rounded-[16px] shadow-lg border-b border-[#2C2C2C]"
      style={{ border: "0.62px solid #181818" }}
    >
      <div className="relative z-10 flex flex-col">
        <div
          ref={headerRef}
          className="bg-[#242424] rounded-t-2xl p-3 sm:p-5"
        >
          <div
            className="
              block
              sm:grid sm:grid-cols-3 sm:[grid-template-rows:repeat(2,minmax(36px,auto))]
              sm:items-center sm:gap-x-0 sm:gap-y-0
            "
          >
            <p className="text-xs text-[#606060] font-semibold text-center pb-1 sm:pb-0 sm:row-start-1 sm:col-start-1 sm:self-start whitespace-nowrap">
              Your bet:
            </p>
            <p className="font-medium text-sm sm:text-[16px] text-[#D7DFEF] text-center whitespace-normal break-words sm:row-start-2 sm:col-start-1 sm:pr-2">
              {Number(localBetAmount)?.toLocaleString("en-US")}{" "}
              {updatedCurrency === CurrencyType.GOLD_COINS ? "Gold Coins" : "Sweep Coins"}
            </p>
            <p className="sm:hidden text-xs text-[#606060] font-semibold text-center pb-1 border-t border-[#2C2C2C] mt-3 pt-3">
              Selected winner:
            </p>
            <p className="hidden sm:block text-xs text-[#606060] font-semibold text-center sm:row-start-1 sm:col-start-2 sm:self-start whitespace-nowrap sm:border-l sm:border-[#2C2C2C] sm:px-4">
              Selected winner:
            </p>
            <p
              className="font-medium text-sm sm:text-[16px] text-[#D7DFEF] text-center whitespace-normal break-words sm:row-start-2 sm:col-start-2 sm:border-l sm:border-r sm:border-[#2C2C2C] sm:px-4"
              title={localOption || ""}
            >
              {localOption}
            </p>
            <p className="sm:hidden text-xs text-[#606060] font-semibold text-center pb-1 border-t border-[#2C2C2C] mt-3 pt-3">
              Potential winnings:
            </p>
            <p className="hidden sm:block text-xs text-[#606060] font-semibold text-center sm:row-start-1 sm:col-start-3 sm:self-start whitespace-nowrap sm:border-l sm:border-[#2C2C2C] sm:pl-4">
              Potential winnings:
            </p>
            <p className="font-medium text-sm sm:text-[16px] text-[#BDFF00] text-center whitespace-normal break-words sm:row-start-2 sm:col-start-3 sm:pl-2">
              {Number(Math.round(Number(potentialWinnings ?? 0))).toLocaleString("en-US")}
            </p>
          </div>
        </div>
        <div
          className="relative w-full flex flex-col justify-center items-center"
          style={{ minHeight: headerH > 0 ? headerH * 2 : undefined }}
        >
          <p className="text-2xl font-bold text-[#FFFFFF] text-center pb-4">
            {lockedBet
              ? "Bets are locked. Good luck!"
              : isStreamScheduled
              ? "Bets may be locked soon"
              : "Bets will be locked soon"}
          </p>

          {!lockedBet && (
            <div className="flex justify-center gap-4">
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
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 100% at 50% 100%, rgba(189, 255, 0, 0.25) -140%, transparent 100%)",
            }}
          ></div>
        </div>
      </div>

      {lockedBet && (
        <>
          <img 
            src="/icons/lock1.svg"
            alt="lock left"
            className="absolute top-20 left-0 w-[220px] h-[180px]"
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
              <h3 className="text-lg font-semibold text-white mb-2">Cancel Bet?</h3>
              <p className="text-[#D7DFEF] text-sm">
                Are you sure you want to cancel your bet? <br />
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
