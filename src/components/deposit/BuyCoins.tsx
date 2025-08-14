import React from 'react';



const BuyCoins = () => {

  const coinOptions = [
    { img: '/icons/coin1.svg', amount: '1,000', promo: 'up to 32.32 stream cash' },
    { img: '/icons/coin2.svg', amount: '5,000', promo: 'up to 32.32 stream cash' },
    { img: '/icons/coin3.svg', amount: '10,000', promo: 'up to 32.32 stream cash' },
    { img: '/icons/coin1.svg', amount: '25,000', promo: 'up to 32.32 stream cash' },
  ];

  return (
   <div className="min-h-screen  text-white ">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-medium mb-2">Buy Stream Coins</h2>
        <p className="text-sm text-gray-400">
          With Streambet you have two types of coins to enjoy betting.{' '}
          <span className="text-white  cursor-pointer">Learn more.</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mt-10">
          {coinOptions.map((option, idx) => (
            <div
              key={idx}
              className="bg-[#1C1C1C] rounded-lg p-4 flex flex-col items-center justify-between"
            >
              <img
                src={option.img}
                alt={`coin-${idx}`}
                className="w-[70px] h-[84px] object-contain mb-4"
              />
              <div className="text-[24px] font-semibold mb-1 text-[#BDFF00]">
                {option.amount} 
              </div>
              <span className="text-lg text-[#FFFFFF] mb-4">stream coins</span>

               <div className="flex items-center gap-2 bg-[#3B3E2B] rounded-md px-3 py-2 w-full mb-4">
                <div className="flex items-center justify-center w-6 h-6 text-sm font-bold">
                 <img src="/icons/promo.svg" alt="coin-icon" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-[#0D0D0D] uppercase bg-[#BDFF00] mb-2 text-center w-14 rounded-sm">Promo</span>
                  <span className="text-xs text-[#BDFF00]">{option.promo}</span>
                </div>
              </div>

              <button className="mt-2 bg-[#BDFF00]  text-black font-semibold py-2 px-4 rounded-md w-full text-sm">
                Get started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BuyCoins;
