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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { getImageLink, getMessage } from '@/utils/helper';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import api from '@/integrations/api/client';
import { BettingRounds, validateRounds, ValidationError } from './BettingRounds';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
     AlertDialog,
     AlertDialogTrigger,
     AlertDialogContent,
     AlertDialogHeader,
     AlertDialogFooter,
     AlertDialogTitle,
     AlertDialogDescription,
     AlertDialogAction,
     AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { FabioBoldStyle } from '@/utils/font';

// Helper for status priority
const statusPriority = [
     BettingRoundStatus.OPEN,
     BettingRoundStatus.LOCKED,
     BettingRoundStatus.CREATED,
];

function getActiveRoundIndex(betData) {
     // Find first open, then locked, then created
     for (const status of statusPriority) {
          const idx = betData.findIndex(
               (r) => (r.status || '').toLowerCase().includes(status)
          );
          if (idx !== -1) return idx;
     }
     // do nothing
     return;
}

export const AdminBettingRoundsCard = ({
     isStreamEnded,
     isUpdatingAction,
     isBetRoundCancelling,
     betData,
     handleOpenRound,
     handleLockBets,
     handleEndRound,
     handleCancelRound,
     editStreamId,
     refetchBetData,
}) => {
     const [carouselApi, setCarouselApi] = useState(null);
     const [settingsOpen, setSettingsOpen] = useState(false);
     const [rounds, setRounds] = useState([]);
     const [selectedOption, setSelectedOption] = useState({}); // { [roundId]: optionId }
     const [statusMap, setStatusMap] = useState({});
     const { currency } = useCurrencyContext();
     const isStreamCoins = currency === CurrencyType.STREAM_COINS;
     const [editableRounds, setEditableRounds] = useState([]);
     const [bettingErrorRounds, setBettingErrorRounds] = useState([]);
     const [showBettingValidation, setShowBettingValidation] = useState(false);
     const [bettingSaveLoading, setBettingSaveLoading] = useState(false);
     const { toast } = useToast();
     const [bettingValidationErrors, setBettingValidationErrors] = useState<ValidationError[]>([]);

     useEffect(() => {
          setRounds(betData?.map((r) => ({ ...r })) || []);
          setStatusMap(betData ? Object.fromEntries(betData.map((r) => [r?.roundId, r?.status])) : {});
          setEditableRounds(betData?.map((r) => ({
               roundId: r.roundId,
               roundName: r.roundName,
               options: r.options
          })) || []);
     }, [betData]);

     // Find active round index
     const activeIdx = useMemo(() => getActiveRoundIndex(rounds), [rounds]);

     // Center carousel on active round
     React.useEffect(() => {
          if (carouselApi && typeof activeIdx === 'number') {
               setTimeout(() => carouselApi.scrollTo(activeIdx) ,500);
          }
     }, [carouselApi, activeIdx]);

     // Card/box styles
     const getBoxStyles = (isActive, status) => {
          const borderRadius = 16;
          if (status === BettingRoundStatus.CLOSED || status === BettingRoundStatus.CANCELLED) {
               return {
                    background: '#000',
                    boxShadow: 'none',
                    borderRadius,
               };
          }
          if (isActive) {
               return {
                    background: '#000',
                    border: 'none',
                    boxShadow: '0 4px 16px 0 #BDFF004F, 0 -2px 8px 0 #BDFF004F',
                    borderRadius,
                    position: 'relative' as const,
                    overflow: 'hidden',
               };
          }
          return {
               background: '#00000030',
               boxShadow: 'none',
               borderRadius,
          };
     };

     // Responsive width for card
     const cardWidth = 'w-full';

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
                    >
                         <span className="font-medium [color:rgba(215,223,239,1)] text-lg">Betting Rounds</span>
                         {!isStreamEnded && <Dialog open={settingsOpen} onOpenChange={(open) => {
                              setSettingsOpen(open);
                              if (!open) {
                                   setBettingValidationErrors([]);
                                   setBettingErrorRounds([]);
                                   setShowBettingValidation(false);
                              }
                         }}>
                              <DialogTrigger asChild>
                                   <Button
                                        className="!mt-0 ml-auto h-9 px-6 rounded-lg border border-[#2D343E] bg-[#0D0D0D] text-white/75 font-medium text-[14px] transition-colors duration-150"
                                        style={{ fontWeight: 500, borderRadius: '10px' }}
                                        onClick={() => setSettingsOpen(true)}
                                        onMouseOver={e => (e.currentTarget.style.color = '#000')}
                                        onMouseOut={e => (e.currentTarget.style.color = '')}
                                   >
                                        Betting Settings
                                   </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl winner-scrollbar p-0 border border-primary no-dialog-close">
                                   <div className="p-6">
                                        {/* Back button at the very top */}
                                        <Button
                                             type="button"
                                             variant="secondary"
                                             className="flex w-[94px] h-[44px] items-center gap-2 bg-[#272727] text-white px-5 py-2 rounded-lg shadow-none border-none mb-4"
                                             style={{ borderRadius: '10px', fontWeight: 400 }}
                                             onClick={() => setSettingsOpen(false)}
                                        >
                                             <ArrowLeft className="h-4 w-4 mr-0" /> Back
                                        </Button>
                                        {/* Header row: label, Save button */}
                                        <div className="flex items-center mb-4">
                                             <div className="flex-1 flex items-center justify-between">
                                                  <span className="text-white font-medium" style={{ fontWeight: 500, fontSize: 18 }}>Betting Settings</span>
                                                  <Button
                                                       type="button"
                                                       className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[120px] h-[40px]"
                                                       style={{ borderRadius: '10px' }}
                                                       onClick={async () => {
                                                            // Validation: check for rounds with no options
                                                            const errorIndices = editableRounds
                                                              .map((round, idx) => (round.options.length === 0 ? idx : -1))
                                                              .filter(idx => idx !== -1);
                                                            // Validate for duplicate round/option names
                                                            const validationErrors = validateRounds(editableRounds);
                                                            setBettingValidationErrors(validationErrors);
                                                            setShowBettingValidation(true);
                                                            if (errorIndices.length > 0) {
                                                                 setBettingErrorRounds(errorIndices);
                                                                 toast({ 
                                                                   title: 'Validation Error', 
                                                                   description: 'Each round must have at least one option. Please add options to all rounds before saving.', 
                                                                   variant: 'destructive' 
                                                                 });
                                                                 // Scroll to first error
                                                                 setTimeout(() => {
                                                                   const el = document.querySelector('[data-round-index="' + errorIndices[0] + '"]');
                                                                   if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                 }, 500);
                                                                 return;
                                                            }
                                                            if (validationErrors.length > 0) {
                                                                 // Scroll to first duplicate error
                                                                 setTimeout(() => {
                                                                   const first = validationErrors[0];
                                                                   const el = document.querySelector('[data-round-index="' + first.roundIndex + '"]');
                                                                   if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                 }, 500);
                                                                 toast({
                                                                   title: 'Validation Error',
                                                                   description: validationErrors[0].message,
                                                                   variant: 'destructive',
                                                                 });
                                                                 return;
                                                            }
                                                            setBettingSaveLoading(true);
                                                            try {
                                                                 await api.admin.updateBettingData({ streamId: editStreamId, rounds: editableRounds });
                                                                 refetchBetData();
                                                                 setSettingsOpen(false);
                                                            } catch (e) {
                                                                 toast({ title: 'Error', description: getMessage(e) || 'Failed to update bet', variant: 'destructive' });
                                                            }
                                                            setBettingSaveLoading(false);
                                                       }}
                                                       disabled={bettingSaveLoading}
                                                  >
                                                       {bettingSaveLoading ? 'Saving...' : 'Save'}
                                                  </Button>
                                             </div>
                                        </div>
                                        <Separator className="my-4 bg-[#232323]" />
                                        <BettingRounds
                                             rounds={editableRounds}
                                             statusMap={statusMap}
                                             onRoundsChange={(newRounds) => {
                                                  setEditableRounds(newRounds);
                                                  // Revalidate immediately on any name change
                                                  const validationErrors = validateRounds(newRounds);
                                                  setBettingValidationErrors(validationErrors);
                                             }}
                                             editStreamId={editStreamId}
                                             showValidationErrors={showBettingValidation}
                                             errorRounds={bettingErrorRounds}
                                             onErrorRoundsChange={setBettingErrorRounds}
                                             validationErrors={bettingValidationErrors}
                                        />
                                   </div>
                              </DialogContent>
                         </Dialog>}
                    </CardHeader>
                    {/* Card Content: Carousel */}
                    <CardContent className="bg-transparent px-0 !p-0">
                         <div className="relative group" style={{ maxWidth: windowWidth < 768 ? '80vw' : '50vw' }}>
                              <Carousel
                                   setApi={setCarouselApi}
                                   opts={{ align: 'center', containScroll: 'trimSnaps', slidesToScroll: 1 }}
                                   className="w-full px-1"
                              >
                                   <CarouselContent className="flex items-center !ml-0">
                                        {rounds && rounds?.length > 0 ? rounds.map((round, idx) => {
                                             const status = (statusMap[round.roundId] || round.status || '').toLowerCase();
                                             const isWinner = status === BettingRoundStatus.CLOSED;
                                             const isLocked = status === BettingRoundStatus.LOCKED;
                                             const isOpen = status === BettingRoundStatus.OPEN;
                                             const isCreated = status === BettingRoundStatus.CREATED;
                                             const isCancelled = status === BettingRoundStatus.CANCELLED;
                                             const isActive = (idx === activeIdx) && (isLocked || isOpen || isCreated);
                                             return (
                                                  <CarouselItem
                                                       key={round?.roundId || idx}
                                                       className="flex flex-col items-center justify-between mx-2 rounded-[16px] !px-2 !py-1"
                                                       style={{
                                                            width: slideWidth,
                                                            minWidth: slideWidth,
                                                            maxWidth: 280,
                                                            height: 185,
                                                            ...getBoxStyles(isActive, status),
                                                            flex: '0 0 auto',
                                                            overflow: 'hidden',
                                                            boxSizing: 'border-box',
                                                            borderRadius: 16,
                                                            marginTop: 12,
                                                            marginBottom: 12, // extra space for shadow
                                                            ...(isActive ? { position: 'relative' as const } : {}),
                                                       }}
                                                  >
                                                       {/* Round Name */}
                                                       <div className="w-full flex flex-col items-center justify-center h-full">
                                                            <div
                                                                 className={`text-center text-white/75 text-[13.41px] truncate max-w-full px-2`}
                                                                 style={FabioBoldStyle}
                                                                 title={round?.roundName}
                                                            >
                                                                 {round?.roundName}
                                                            </div>
                                                            {/* Created: show Open button */}
                                                            {isActive && isCreated && (
                                                                 <Button
                                                                      className="mt-4 w-32 rounded-full bg-primary text-black font-bold"
                                                                      style={{ height: '30px' }}
                                                                      disabled={isUpdatingAction}
                                                                      onClick={() => handleOpenRound(round.roundId)}
                                                                 >
                                                                      {isUpdatingAction ? 'Opening...' : 'Open Round'}
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
                                                                      <div className="flex flex-wrap gap-2 justify-center w-full max-h-16 overflow-y-auto mb-2 winner-scrollbar px-2">
                                                                           {round.options.map((opt) => (
                                                                                <span
                                                                                     key={opt.id || opt.optionId || opt.option}
                                                                                     className="px-4 py-1 rounded-full text-sm max-w-[120px] truncate"
                                                                                     style={{
                                                                                          background: '#242424',
                                                                                          color: '#fff',
                                                                                          filter: 'blur(0.5px)',
                                                                                          fontWeight: 500,
                                                                                          backdropFilter: 'blur(8px)',
                                                                                     }}
                                                                                     title={opt.option}
                                                                                >
                                                                                     {opt.option}
                                                                                </span>
                                                                           ))}
                                                                      </div>
                                                                      <Button
                                                                           className="w-full rounded-full bg-primary text-black font-bold"
                                                                           style={{ height: '30px' }}
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
                                                                      <div className="flex flex-wrap gap-2 justify-center w-full max-h-16 overflow-y-auto mb-2 winner-scrollbar px-2">
                                                                           {round.options.map((opt) => {
                                                                                const isSelected = selectedOption[round.roundId] === (opt.id || opt.optionId);
                                                                                return (
                                                                                     <button
                                                                                          key={opt.id || opt.optionId || opt.option}
                                                                                          className={`px-4 py-1 rounded-full text-sm max-w-[120px] truncate focus:outline-none transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
                                                                                          title={opt.option}
                                                                                     >
                                                                                          {opt.option}
                                                                                     </button>
                                                                                );
                                                                           })}
                                                                      </div>
                                                                      <div className="flex flex-row gap-2 w-full mt-2">
                                                                           <Button
                                                                                className="rounded-full font-bold w-1/2"
                                                                                style={{ height: '30px' }}
                                                                                disabled={!selectedOption[round.roundId] || isUpdatingAction}
                                                                                onClick={() => handleEndRound(selectedOption[round.roundId])}
                                                                           >
                                                                                {isUpdatingAction ? 'Ending...' : 'End Round'}
                                                                           </Button>
                                                                           <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                     <Button
                                                                                          className="rounded-full font-bold w-1/2"
                                                                                          style={{ height: '30px' }}
                                                                                          variant="destructive"
                                                                                          disabled={isUpdatingAction || isBetRoundCancelling}
                                                                                     >
                                                                                          {isBetRoundCancelling ? 'Cancelling...' : 'Cancel Round'}
                                                                                     </Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent className='border border-primary'>
                                                                                     <AlertDialogHeader>
                                                                                          <AlertDialogTitle>Cancel Round</AlertDialogTitle>
                                                                                          <AlertDialogDescription>
                                                                                               Are you sure to cancel this round?
                                                                                          </AlertDialogDescription>
                                                                                     </AlertDialogHeader>
                                                                                     <AlertDialogFooter>
                                                                                          <AlertDialogCancel>Dismiss</AlertDialogCancel>
                                                                                          <AlertDialogAction
                                                                                               className="bg-destructive text-white hover:bg-destructive/90"
                                                                                               onClick={() => handleCancelRound(round.roundId)}
                                                                                          >
                                                                                               Confirm
                                                                                          </AlertDialogAction>
                                                                                     </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                           </AlertDialog>
                                                                      </div>
                                                                 </div>
                                                            )}
                                                            {/* Winner: show winner label and options */}
                                                            {isWinner && (
                                                                 <div className="flex flex-col items-center w-full mt-2">
                                                                      {/* Winner label: Avatar + username in a horizontal scrollable row */}
                                                                      {round.winners && (isStreamCoins ? round.winners.streamCoins?.length > 0 : round.winners.freeTokens?.length > 0) ? (
                                                                           <div className="flex flex-col items-center w-full">
                                                                                <div
                                                                                     className="flex flex-row gap-4 overflow-x-auto pb-2 w-full max-w-full winner-scrollbar px-2"
                                                                                     style={{ maxWidth: '100%', scrollbarWidth: 'thin' }}
                                                                                >
                                                                                     {(isStreamCoins ? round.winners.streamCoins : round.winners.freeTokens)?.map((winner: any, idx: number) => (
                                                                                          <div key={idx} className="flex flex-col items-center min-w-[70px]">
                                                                                               <Avatar className="h-10 w-10 mb-1">
                                                                                                    <AvatarImage src={getImageLink(winner?.avatar)} alt={winner?.userName} />
                                                                                                    <AvatarFallback>{winner?.userName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                                                                                               </Avatar>
                                                                                               {/* Tooltip on username */}
                                                                                               <span
                                                                                                    className="text-white text-[12px] text-center truncate max-w-[60px] cursor-pointer"
                                                                                                    style={FabioBoldStyle}
                                                                                                    title={winner?.userName}
                                                                                               >
                                                                                                    {winner?.userName}
                                                                                               </span>
                                                                                          </div>
                                                                                     ))}
                                                                                </div>
                                                                                <div className="flex items-center mt-1 text-[12px] px-2" style={FabioBoldStyle}>
                                                                                     <span className="text-white ml-1">won</span>
                                                                                     <span className="text-white ml-1 truncate max-w-[120px]" title={isStreamCoins ? `${Number(round?.winnerAmount?.streamCoins || 0)?.toLocaleString('en-US')} coins` 
                                                                                     : `${Number(round?.winnerAmount?.freeTokens || 0)?.toLocaleString('en-US')} tokens`}>
                                                                                          {isStreamCoins ? `${Number(round?.winnerAmount?.streamCoins || 0)?.toLocaleString('en-US')} coins` 
                                                                                          : `${Number(round?.winnerAmount?.freeTokens || 0)?.toLocaleString('en-US')} tokens`}
                                                                                     </span>
                                                                                </div>
                                                                           </div>
                                                                      ) : (<span className='text-center'>Round closed with no winner</span>)}
                                                                 </div>
                                                            )}
                                                            {/* Cancelled: show message */}
                                                            {isCancelled && (
                                                                 <div className="flex flex-col items-center w-full mt-2">
                                                                      <span className='text-center'>Round cancelled</span>
                                                                 </div>
                                                            )}
                                                       </div>
                                                       {isActive && (
                                                            <div
                                                                 style={{
                                                                      position: 'absolute',
                                                                      top: 0,
                                                                      left: 0,
                                                                      right: 0,
                                                                      bottom: 0,
                                                                      borderRadius: 16,
                                                                      inset: '-1px',
                                                                      padding: '1.5px',
                                                                      background: 'conic-gradient(from 0deg, #BDFF00 0deg, #BDFF00 60deg, transparent 90deg, transparent 270deg, #BDFF00 300deg, #BDFF00 360deg)',
                                                                      WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                                                                      WebkitMaskComposite: 'xor',
                                                                      mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                                                                      maskComposite: 'exclude',
                                                                      pointerEvents: 'none',
                                                                      zIndex: 3,
                                                                 }}
                                                            />
                                                       )}
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
                                        {/* Left hover area */}
                                        <div className="absolute left-0 top-0 h-full w-12 z-10 group/arrow-area pointer-events-none">
                                             <CarouselPrevious
                                                  className="left-2 opacity-0 group-hover/arrow-area:opacity-100 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
                                                  style={{ pointerEvents: 'auto' }}
                                             />
                                        </div>
                                        {/* Right hover area */}
                                        <div className="absolute right-0 top-0 h-full w-12 z-10 group/arrow-area pointer-events-none">
                                             <CarouselNext
                                                  className="right-2 opacity-0 group-hover/arrow-area:opacity-100 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
                                                  style={{ pointerEvents: 'auto' }}
                                             />
                                        </div>
                                   </div>
                              </Carousel>
                         </div>
                    </CardContent>
               </Card>
          </div>
     );
}; 
