import { useState } from "react";



export default function BetTokens() {
  const [betAmount, setBetAmount] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const colors = ["Green", "Pink", "Orange", "Purple"];
  const handleColorClick = (color: string) => {
    setSelectedColor(color);
    setBetAmount(0);
  };

  return (
    <div className="bg-[rgba(24, 24, 24, 1)] rounded-2xl p-4 w-full text-white space-y-4 shadow-lg border" style={{ border: '0.62px solid rgba(44, 44, 44, 1)' }}>
      {/* Title */}
      <div className="flex items-center justify-between w-full text-xl font-medium">
        <div className="text-[rgba(255,255,255,1)] text-[24px] font-bold">
          Bet <span style={{ color: 'rgba(189,255,0,1)' }} className="text-[24px] font-bold">{betAmount}</span> Free Tokens
        </div>
        <div className="flex gap-2">
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal">
            First Round
            </span>
          <span className="bg-[#242424] rounded-[28px] px-4 py-2 text-[rgba(255, 255, 255, 1)] text-xs font-normal">
            Total Pot: 0 Free Tokens
            </span>
        </div>
      </div>



      {/* Slider */}
      <div className="relative w-full pt-2 pb-2">
        <input
          type="range"
          min="0"
          max="1000"
          value={betAmount}
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
              background: url('/icons/thumb.svg') no-repeat center center / contain;
              cursor: pointer;
            }
            input[type="range"]::-moz-range-thumb {
              height: 32px;
              width: 32px;
              background: url('/icons/thumb.svg') no-repeat center center / contain;
              cursor: pointer;
            }
            input[type="range"]::-ms-thumb {
              height: 32px;
              width: 32px;
              background: url('/icons/thumb.svg') no-repeat center center / contain;
              cursor: pointer;
            }
          `}
        </style>
      </div>

      {/* Color Selection */}
      <div className="flex justify-between gap-2 pb-1">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            className={`flex-1 py-3.5 rounded-[28px] font-medium transition bg-[#242424]`}
            style={{ border: selectedColor === color ? '1px solid rgba(189, 255, 0, 1)' : '#242424',
               color: selectedColor === color ? 'rgba(189, 255, 0, 1)' : '#FFFFFF'
             }}
          >
            {color}
          </button>
        ))}
      </div>

      {/* Bet Button */}
      <button className="w-full bg-[#BDFF00] text-black font-bold py-2 rounded-full hover:brightness-105 transition text-[16px]">
        Bet
      </button>
    </div>
  );
}
