import { useState } from "react";

interface BetTokensProps {
  streamId?: string;
  session: any;
}

export default function BetTokens({ streamId, session }: BetTokensProps) {
  const [betAmount, setBetAmount] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const colors = ["Green", "Pink", "Orange", "Purple"];
  const handleColorClick = (color: string) => {
    setSelectedColor(color);
    // setBetAmount(0); // Remove this line to prevent slider from resetting
  };

  const isColorButtonsEnabled = betAmount > 0;
  const isBetButtonEnabled = selectedColor !== "";

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
            First Round
            </span>
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal sm:text-xs text-[10px]">
            Total Pot: 0 Free Tokens
            </span>
        </div>
      </div>

      <div className="relative w-full pt-2 pb-2">
        <input
          type="range"
          min="0"
          max="1000"
          value={betAmount}
          disabled={session == null}
          onChange={(e) => setBetAmount(parseInt(e.target.value))}
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


      <div className="flex justify-between gap-2 pb-1">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => isColorButtonsEnabled && handleColorClick(color)}
            className={`flex-1 py-3.5 rounded-[28px] font-medium transition bg-[#242424] text-base sm:text-base text-xs ${!isColorButtonsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ border: selectedColor === color ? '1px solid rgba(189, 255, 0, 1)' : '#242424',
               color: selectedColor === color ? 'rgba(189, 255, 0, 1)' : '#FFFFFF',
             }}
            disabled={!isColorButtonsEnabled}
          >
            {color}
          </button>
        ))}
      </div>

      <button
        className="w-full bg-[#BDFF00] text-black font-bold py-2 rounded-full hover:brightness-105 transition text-lg sm:text-base text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isBetButtonEnabled || betAmount<=0}
      >
        Bet {betAmount} on {selectedColor}
      </button>
    </div>
  );
}
