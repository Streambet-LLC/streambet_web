import { useQuery } from "@tanstack/react-query";
import { Separator } from "../ui/separator";
import api from "@/integrations/api/client";
import { getImageLink } from "@/utils/helper";
import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";

const BuyCoins = ({ 
  setDepositAmount,
  setPackageId,
 }: { 
    setDepositAmount: (amount: number) => void,
    setPackageId: (id: string) => void
  }) => {
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: number]: boolean }>({});

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
            Streambet employs a 2-token Sweepstakes model, where you can purchase gold coins packs that include Stream Coins, alongside.{' '}
            <Dialog>
              <DialogTrigger asChild>
                <span className="text-white cursor-pointer">How it Works</span>
              </DialogTrigger>
              <DialogContent className="bg-[#0D0D0D] text-white sm:rounded-xl px-6 pt-4 pb-6 border-2 border-[#7AFF14]">
                <DialogHeader>
                  <DialogTitle>How this works</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  <p>
                    Streambet employs a 2-token Sweepstakes model, where you can purchase gold coins packs that include Stream Coins, alongside.
                  </p>
                  <p className="mt-2">
                    Gold coins (aka free coins) can be used to make free picks on participation streams / contents, where creators may offer prizes for engagement.
                  </p>
                  <p className="mt-2">
                    Stream coins can be used for real-$ picks, where creators host real-$ contests. This is where things get realllly interesting.
                  </p>
                  <p className="mt-2">
                    Contact us with any questions via Discord, email, or Instagram.
                  </p>
                  <p className="mt-2">
                    Good luck, have fun, and may the sweeps be with you!
                  </p>
                </DialogDescription>
                <DialogFooter>
                <DialogClose asChild>
                  <Button className="mx-auto">
                    Got it!
                  </Button>
                </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                  className="bg-[#1C1C1C] rounded-lg p-4"
                >
                  <div className="flex gap-4">
                  <div className="relative w-[70px] h-[84px] mb-4 flex items-center justify-center">
                    {imageLoadingStates[idx] && (
                      <div className="absolute inset-0 bg-gray-700 rounded-lg animate-pulse"></div>
                    )}
                    <img
                      src={getImageLink(option?.imageUrl)}
                      alt={`coin-${idx}`}
                      className={`w-[70px] h-[84px] object-contain transition-opacity duration-300 ${
                        imageLoadingStates[idx] ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoad={() => handleImageLoad(idx)}
                    />
                  </div>
                  <div className="flex flex-col my-auto leading-none">
                  <div className="text-[24px] font-semibold text-[#BDFF00]">
                    {Number(option.goldCoinCount || 0)?.toLocaleString('en-US')} 
                  </div>
                  <span className="text-lg text-[#FFFFFF] mb-4">gold coins</span>
                  </div>
                  </div>

                  <div className="flex items-center bg-[#3B3E2B] rounded-md w-full mb-4 h-[70px]">
                    <div className="flex items-center justify-center text-sm font-bold w-[60px] h-[60px]">
                     <img src="/icons/promo.svg" alt="coin-icon" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#0D0D0D] uppercase bg-[#BDFF00] text-center w-14 rounded-sm">Promo</span>
                      <span className="text-xs text-[#BDFF00]">Get {Number(option.sweepCoinCount || 0)?.toLocaleString('en-US')} free Stream Coins</span>
                    </div>
                  </div>

                  <button className="mt-2 bg-[#BDFF00] text-black font-semibold py-2 px-4 rounded-full w-full text-sm" 
                    onClick={() => {
                      setPackageId(option.id || '');
                      setDepositAmount(parseFloat(option.totalAmount || 0));
                    }}>
                      ${option.totalAmount || 0}
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
