import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
     Card,
     CardHeader,
     CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
     Carousel,
     CarouselContent,
     CarouselItem,
     CarouselNext,
     CarouselPrevious,
} from '@/components/ui/carousel';
import {
     Dialog,
     DialogTrigger,
     DialogContent,
} from '@/components/ui/dialog';
import { BettingRoundStatus } from '@/types/bet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Helper for status priority
const statusPriority = [
     BettingRoundStatus.OPEN,
     BettingRoundStatus.LOCKED,
     BettingRoundStatus.CREATED,
];

function getStatusPriority(status) {
     if (!status) return 99;
     const idx = statusPriority.indexOf(status.toLowerCase());
     return idx === -1 ? 99 : idx;
}

function getActiveRoundIndex(betData) {
     // Find first open, then locked, then created
     for (const status of statusPriority)
     {
          const idx = betData.findIndex(
               (r) => (r.status || '').toLowerCase().includes(status)
          );
          if (idx !== -1) return idx;
     }
     // fallback to first
     return 0;
}

export const AdminBettingRoundsCard = ({
     isUpdatingAction,
     betData,
     handleOpenRound,
     handleLockBets,
     handleEndRound,
}) => {
     const [carouselApi, setCarouselApi] = useState(null);
     const [settingsOpen, setSettingsOpen] = useState(false);
     const [rounds, setRounds] = useState([]);
     const [selectedOption, setSelectedOption] = useState({}); // { [roundId]: optionId }
     const [statusMap, setStatusMap] = useState({});
  
     useEffect(() => {
          setRounds(betData?.map((r) => ({ ...r })) || []);
          setStatusMap(betData ? Object.fromEntries(betData.map((r) => [r?.roundId, r?.status])) : {});
     }, [betData]);

     // Find active round index
     const activeIdx = useMemo(() => getActiveRoundIndex(rounds), [rounds]);

     // Center carousel on active round
     React.useEffect(() => {
          if (carouselApi && typeof activeIdx === 'number')
          {
               carouselApi.scrollTo(activeIdx);
          }
     }, [carouselApi, activeIdx]);

     // Handlers for status changes
     //   const handleOpenRound = (roundId) => {
     //     setStatusMap((prev) => ({ ...prev, [roundId]: BettingRoundStatus.OPEN }));
     //     setRounds((prev) =>
     //       prev.map((r) =>
     //         r?.roundId === roundId ? { ...r, status: BettingRoundStatus.OPEN } : r
     //       )
     //     );
     //   };
     //   const handleLockBets = (roundId) => {
     //     setStatusMap((prev) => ({ ...prev, [roundId]: BettingRoundStatus.LOCKED }));
     //     setRounds((prev) =>
     //       prev.map((r) =>
     //         r?.roundId === roundId ? { ...r, status: BettingRoundStatus.LOCKED } : r
     //       )
     //     );
     //   };
     //   const handleEndRound = (roundId) => {
     //     setStatusMap((prev) => ({ ...prev, [roundId]: BettingRoundStatus.WINNER }));
     //     setRounds((prev) =>
     //       prev.map((r) =>
     //         r?.roundId === roundId ? { ...r, status: BettingRoundStatus.WINNER } : r
     //       )
     //     );
     //   };

     // Card/box styles
     const getBoxStyles = (isActive, status) => {
          const borderRadius = 16;
          if (status === BettingRoundStatus.WINNER)
          {
               return {
                    background: '#000',
                    border: '1px solid #2C2C2C',
                    boxShadow: 'none',
                    borderRadius,
               };
          }
          if (isActive)
          {
               return {
                    background: '#000',
                    border: '1px solid',
                    borderImage: 'linear-gradient(180deg, #BDFF00, #0000001F) 1',
                    boxShadow: '0 8px 32px 0 #BDFF004F',
                    borderRadius,
               };
          }
          return {
               background: '#181818',
               border: '1px solid #2C2C2C',
               boxShadow: 'none',
               borderRadius,
          };
     };

     // Option capsule styles
     const getOptionStyles = (isSelected, isLocked, isWinner) => {
          if (isWinner)
          {
               return {
                    background: '#BDFF00',
                    color: '#000',
                    fontWeight: 700,
               };
          }
          if (isSelected)
          {
               return {
                    background: '#BDFF00',
                    color: '#000',
                    fontWeight: 700,
               };
          }
          if (isLocked)
          {
               return {
                    background: '#242424',
                    color: '#fff',
                    filter: 'brightness(1.2)',
               };
          }
          return {
               background: '#242424',
               color: '#fff',
               opacity: 0.8,
               filter: 'blur(0.5px)',
          };
     };

     // Responsive width for card
     const cardWidth = 'w-full';

     // Responsive slide width
     const getSlideWidth = () => {
          if (typeof window !== 'undefined' && window.innerWidth < 640) return '100%';
          if (typeof window !== 'undefined' && window.innerWidth < 1024) return 220;
          return 260;
     };

     // Track window width for responsive slides
     const [windowWidth, setWindowWidth] = React.useState(
          typeof window !== 'undefined' ? window.innerWidth : 1200
     );
     React.useEffect(() => {
          const handleResize = () => setWindowWidth(window.innerWidth);
          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
     }, []);
     const slideWidth = windowWidth < 640 ? '100%' : windowWidth < 1024 ? 220 : 260;

     return (
          <div className="flex flex-col items-center w-full mt-4">
               <Card
                    className={`rounded-xl border-[0.62px] border-[#2C2C2C] ${cardWidth} bg-[#181818] shadow-none`}
                    style={{ width: '100%' }}
               >
                    {/* Card Header */}
                    <CardHeader
                         className="flex flex-row items-center justify-between h-[50px] rounded-t-xl px-6 py-0 bg-[#000000B2]"
                         style={{ borderBottom: '0.62px solid #2C2C2C' }}
                    >
                         <span className="font-medium text-white/80 text-lg">Betting Rounds</span>
                         <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                              <DialogTrigger asChild>
                                   <Button
                                        className="ml-auto h-9 px-6 rounded-lg border border-[#2D343E] bg-[#0D0D0D] text-white/75 font-medium text-[14px] transition-colors duration-150"
                                        style={{ fontWeight: 500, borderRadius: '10px' }}
                                        onClick={() => setSettingsOpen(true)}
                                        onMouseOver={e => (e.currentTarget.style.color = '#000')}
                                        onMouseOut={e => (e.currentTarget.style.color = '')}
                                   >
                                        Betting Settings
                                   </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xs text-center">
                                   <div className="py-8 text-lg font-semibold">Coming Soon!</div>
                              </DialogContent>
                         </Dialog>
                    </CardHeader>
                    {/* Card Content: Carousel */}
                    <CardContent className="bg-transparent px-0 py-4">
                         <div className="relative group">
                              <Carousel
                                   setApi={setCarouselApi}
                                   opts={{ align: 'center', containScroll: 'trimSnaps', slidesToScroll: 1 }}
                                   className="w-full"
                              >
                                   <CarouselContent className="flex items-center" style={{ paddingLeft: windowWidth < 640 ? 0 : 32 }}>
                                        {rounds && rounds.length > 0 ? rounds.map((round, idx) => {
                                             const isActive = idx === activeIdx;
                                             const status = (statusMap[round.roundId] || round.status || '').toLowerCase();
                                             const isWinner = status === BettingRoundStatus.WINNER;
                                             const isLocked = status === BettingRoundStatus.LOCKED;
                                             const isOpen = status === BettingRoundStatus.OPEN;
                                             const isCreated = status === BettingRoundStatus.CREATED;
                                             return (
                                                  <CarouselItem
                                                       key={round.roundId || idx}
                                                       className="flex flex-col items-center justify-between mx-2 rounded-[16px]"
                                                       style={{
                                                            width: slideWidth,
                                                            minWidth: slideWidth,
                                                            maxWidth: 280,
                                                            height: 185,
                                                            ...getBoxStyles(isActive, status),
                                                            flex: '0 0 auto',
                                                            overflow: 'visible',
                                                            boxSizing: 'border-box',
                                                            borderRadius: 16,
                                                            marginTop: 12,
                                                            marginBottom: 12, // extra space for shadow
                                                       }}
                                                  >
                                                       {/* Round Name */}
                                                       <div className="w-full flex flex-col items-center justify-center h-full">
                                                            <div
                                                                 className="text-center text-white text-lg font-semibold truncate"
                                                                 style={{ fontWeight: 700 }}
                                                            >
                                                                 {round.roundName}
                                                            </div>
                                                            {/* Created: show Open button */}
                                                            {isActive && isCreated && (
                                                                 <Button
                                                                      className="mt-4 w-32 rounded-full bg-primary text-black font-bold"
                                                                      disabled={isUpdatingAction}
                                                                      onClick={() => handleOpenRound(round.roundId)}
                                                                 >
                                                                      {isUpdatingAction ? 'Opening...' : 'Open'}
                                                                 </Button>
                                                            )}
                                                            {/* Open: show betting options, lock bets button */}
                                                            {isActive && isOpen && (
                                                                 <div className="flex flex-col items-center w-full mt-2">
                                                                      <div
                                                                           className="text-center mb-2 text-white text-base font-bold"
                                                                           style={{ fontFamily: 'FabioXM, Inter, sans-serif', fontWeight: 700 }}
                                                                      >
                                                                           Users are betting
                                                                      </div>
                                                                      <div className="flex flex-wrap gap-2 justify-center w-full max-h-16 overflow-y-auto mb-2">
                                                                           {round.options.map((opt) => (
                                                                                <span
                                                                                     key={opt.id || opt.optionId || opt.option}
                                                                                     className="px-4 py-1 rounded-full text-sm"
                                                                                     style={{
                                                                                          background: '#242424',
                                                                                          color: '#fff',
                                                                                          filter: 'blur(0.5px)',
                                                                                          fontWeight: 500,
                                                                                          backdropFilter: 'blur(8px)',
                                                                                     }}
                                                                                >
                                                                                     {opt.option}
                                                                                </span>
                                                                           ))}
                                                                      </div>
                                                                      <Button
                                                                           className="w-full rounded-full bg-primary text-black font-bold"
                                                                           onClick={() => handleLockBets(round.roundId)}
                                                                           disabled={isUpdatingAction}
                                                                      >
                                                                           {isUpdatingAction ? 'Locking...' : 'Lock Bets'}
                                                                      </Button>
                                                                 </div>
                                                            )}
                                                            {/* Locked: show options, enable selection, end round button */}
                                                            {isActive && isLocked && (
                                                                 <div className="flex flex-col items-center w-full mt-2">
                                                                      <div
                                                                           className="text-center mb-2 text-white text-base font-bold"
                                                                           style={{ fontFamily: 'FabioXM, Inter, sans-serif', fontWeight: 700 }}
                                                                      >
                                                                           Bets are locked - pick a winner
                                                                      </div>
                                                                      <div className="flex flex-wrap gap-2 justify-center w-full max-h-16 overflow-y-auto mb-2">
                                                                           {round.options.map((opt) => {
                                                                                const isSelected = selectedOption[round.roundId] === (opt.id || opt.optionId);
                                                                                return (
                                                                                     <button
                                                                                          key={opt.id || opt.optionId || opt.option}
                                                                                          className={`px-4 py-1 rounded-full text-sm focus:outline-none transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
                                                                                          style={
                                                                                               isSelected
                                                                                                    ? {
                                                                                                         background: '#BDFF00',
                                                                                                         color: '#000',
                                                                                                         fontWeight: 700,
                                                                                                    }
                                                                                                    : {
                                                                                                         background: '#242424',
                                                                                                         color: '#fff',
                                                                                                         filter: 'brightness(1.2)',
                                                                                                    }
                                                                                          }
                                                                                          onClick={() => setSelectedOption((prev) => ({ ...prev, [round.roundId]: opt.id || opt.optionId }))}
                                                                                     >
                                                                                          {opt.option}
                                                                                     </button>
                                                                                );
                                                                           })}
                                                                      </div>
                                                                      <Button
                                                                           className="w-full rounded-full bg-primary text-black font-bold"
                                                                           disabled={!selectedOption[round.roundId]}
                                                                           onClick={() => handleEndRound(selectedOption[round.roundId])}
                                                                      >
                                                                           End Round
                                                                      </Button>
                                                                 </div>
                                                            )}
                                                            {/* Winner: show winner label and options */}
                                                            {isWinner && (
                                                                 <div className="flex flex-col items-center w-full mt-2">
                                                                      {/* Winner label: Avatar + username inline, then 'won winnerAmount' */}
                                                                      {round.winners && round.winners.length > 0 && (
                                                                           <div className="flex items-center justify-center gap-2 mb-2">
                                                                                <Avatar className="h-6 w-6">
                                                                                     <AvatarImage src={round.winners[0].avatar} alt={round.winners[0].userName} />
                                                                                     <AvatarFallback>{round.winners[0].userName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-white text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>{round.winners[0].userName}</span>
                                                                                <span className="text-white text-sm font-normal ml-1">won</span>
                                                                                <span className="text-primary text-sm font-semibold ml-1">{round.winnerAmount}</span>
                                                                           </div>
                                                                      )}
                                                                 </div>
                                                            )}
                                                       </div>
                                                  </CarouselItem>
                                             );
                                        }) : (
                                             <div className="w-full flex items-center justify-center h-32 text-white/60 text-lg">
                                                  No betting rounds available.
                                             </div>
                                        )}
                                   </CarouselContent>
                                   {/* Carousel Arrows: show on hover/near edges */}
                                   <div className="hidden md:block">
                                        <CarouselPrevious className="left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        <CarouselNext className="right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                   </div>
                              </Carousel>
                         </div>
                    </CardContent>
               </Card>
          </div>
     );
}; 
