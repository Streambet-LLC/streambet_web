import { useQuery } from "@tanstack/react-query";
import { Separator } from "../ui/separator";
import api from "@/integrations/api/client";
import { getImageLink } from "@/utils/helper";
import { useState } from "react";

const BuyCoins = ({ 
  setDepositAmount,
  setPackageId,
 }: { 
    setDepositAmount: (amount: number) => void,
    setPackageId: (id: string) => void
  }) => {
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: number]: boolean }>({});
  const [imageErrorStates, setImageErrorStates] = useState<{ [key: number]: boolean }>({});

  const {
    data: coinPackages,
    isFetching: isCoinPackagesLoading,
  } = useQuery({
    queryKey: ['coinPackages'],
    queryFn: async () => {
        const response = await api.wallet.getCoinPackages();
        return response?.data;
    },
  });

  const handleImageLoad = (index: number) => {
    setImageLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setImageLoadingStates(prev => ({ ...prev, [index]: false }));
    setImageErrorStates(prev => ({ ...prev, [index]: true }));
  };

  const getImageSrc = (option: any, index: number) => {
    if (imageErrorStates[index]) {
      // Fallback to original coin icons based on index
      const fallbackIcons = ['/icons/coin1.png', '/icons/coin2.png', '/icons/coin3.png', '/icons/coin1.png'];
      return fallbackIcons[index % fallbackIcons.length];
    }
    return getImageLink(option.imageUrl);
  };

  return (
   <div className="min-h-screen text-white ">
      {isCoinPackagesLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BDFF00] mx-auto mb-4"></div>
            <p className="text-lg text-gray-300">Loading packages...</p>
          </div>
        </div>
      )}
      {!isCoinPackagesLoading && (
        <div className="mx-auto">
          <h2 className="text-lg font-medium mb-2">Buy Gold Coins</h2>
          <p className="text-sm text-gray-400">
            With Streambet you have two types of coins to enjoy betting.{' '}
            <span className="text-white cursor-pointer">Learn more.</span>
          </p>
          <Separator className="my-4 bg-[#232323]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mt-10">
            {coinPackages?.map((option, idx) => {
              // Initialize loading state for this image
              if (imageLoadingStates[idx] === undefined) {
                setImageLoadingStates(prev => ({ ...prev, [idx]: true }));
              }
              
              return (
                <div
                  key={idx}
                  className="bg-[#1C1C1C] rounded-lg p-4 flex flex-col items-center justify-between"
                >
                  <div className="relative w-[70px] h-[84px] mb-4 flex items-center justify-center">
                    {imageLoadingStates[idx] && (
                      <div className="absolute inset-0 bg-gray-700 rounded-lg animate-pulse"></div>
                    )}
                    <img
                      src={getImageSrc(option, idx)}
                      alt={`coin-${idx}`}
                      className={`w-[70px] h-[84px] object-contain transition-opacity duration-300 ${
                        imageLoadingStates[idx] ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoad={() => handleImageLoad(idx)}
                      onError={() => handleImageError(idx)}
                    />
                  </div>
                  <div className="text-[24px] font-semibold mb-1 text-[#BDFF00]">
                    {Number(option.goldCoinCount || 0)?.toLocaleString('en-US')} 
                  </div>
                  <span className="text-lg text-[#FFFFFF] mb-4">gold coins</span>

                   <div className="flex items-center gap-2 bg-[#3B3E2B] rounded-md px-3 py-2 w-full mb-4">
                    <div className="flex items-center justify-center w-6 h-6 text-sm font-bold">
                     <img src="/icons/promo.svg" alt="coin-icon" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-bold text-[#0D0D0D] uppercase bg-[#BDFF00] mb-2 text-center w-14 rounded-sm">Promo</span>
                      <span className="text-xs text-[#BDFF00]">up to 32.32 stream cash</span>
                    </div>
                  </div>

                  <button className="mt-2 bg-[#BDFF00] text-black font-semibold py-2 px-4 rounded-md w-full text-sm" 
                    onClick={() => {
                      setPackageId(option.id || '');
                      setDepositAmount(parseFloat(option.totalAmount || 0));
                    }}>
                      Get started
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default BuyCoins;
