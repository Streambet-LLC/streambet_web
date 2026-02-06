import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteBettingDialog } from './DeleteBettingDialog';
import { InlineEditable } from './InlineEditable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Edit, Copy, AlertCircle } from 'lucide-react';
import { BettingRoundStatus, BettingCategory, BetRoundType, PickMechanism } from '@/enums';
import { toast } from '@/components/ui/use-toast';
import { getCategoryLabel } from '@/utils/categoryHelpers';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  TEMP_OPTION_PREFIX,
  cleanTemporaryIds,
  isTemporaryOptionId,
  getCleanedRounds,
} from '@/utils/bettingRoundsUtils';
import { isScheduledTimeInPast } from '@/utils/helper';
import CalendarDatePicker from '../ui/CalendarDatePicker';
import { BetCard as BetCardType } from '@/types/bet';
import BetCardPreview from '../BetCardPreview';
import { getBetRoundTypeLabel } from '@/utils/betRoundHelpers';
import {
  getPickMechanismLabel,
  SENTIMENT_REVEAL_RULES,
  MAX_SENTIMENT_OPTIONS,
} from '@/utils/pickMechanismHelpers';

interface BettingOption {
  optionId?: string;
  option: string;
}

interface BettingRound {
  roundId?: string;
  roundName: string;
  category?: BettingCategory;
  betRoundType?: BetRoundType;
  mechanism?: PickMechanism;
  lockDate?: Date | null;
  lockTime?: string;
  lockTimezone?: string;
  options: BettingOption[];
}

export interface ValidationError {
  type: 'round' | 'option';
  roundIndex: number;
  optionIndex?: number;
  message: string;
}

interface BettingRoundsProps {
  isSaving: boolean;
  rounds: BettingRound[];
  onRoundsChange: (rounds: BettingRound[]) => void;
  editStreamId?: string;
  showValidationErrors?: boolean;
  errorRounds?: number[];
  statusMap?: any;
  onErrorRoundsChange?: (errorRounds: number[]) => void;
  validationErrors?: ValidationError[];
  createStream?: boolean;
  handleCreateStream?: () => void;
  eventType: string;
  betCardInfo: Pick<BetCardType, 'type' | 'streamName' | 'description' | 'creator' | 'thumbnail'>;
}

export function BettingRounds({
  eventType,
  isSaving,
  rounds,
  onRoundsChange,
  editStreamId,
  showValidationErrors,
  errorRounds = [],
  statusMap,
  onErrorRoundsChange,
  validationErrors,
  createStream,
  handleCreateStream,
  betCardInfo,
}: BettingRoundsProps) {
  const isMobile = useIsMobile();
  const [expandedRounds, setExpandedRounds] = useState<string[]>([]);
  const [alertDialogIndex, setAlertDialogIndex] = useState<number | null>(null);
  const roundRefs = useRef<(HTMLDivElement | null)[]>([]);
  const roundsListRef = useRef<HTMLDivElement | null>(null);
  const prevRoundsLength = useRef<number>(rounds.length);
  const optionRefs = useRef<Array<Array<HTMLTableRowElement | null>>>([]);
  const [lastAddedOption, setLastAddedOption] = useState<{
    roundIndex: number;
    optionId: string;
  } | null>(null);

  const [roundsState, setRoundsState] = useState<BettingRound[]>(rounds || []);

  const roundsOptionsPreview = useMemo(() => {
    return roundsState.map(round =>
      round.options.map(option => ({
        option: option.option,
        percentage: 100,
        isWinner: false,
      }))
    );
  }, [roundsState]);

  // Auto-expand first round if it's the only round, and auto-expand any newly added rounds
  useEffect(() => {
    if (rounds.length === 1 && !expandedRounds.includes('round-0')) {
      setExpandedRounds(['round-0']);
    } else if (rounds.length > prevRoundsLength.current) {
      // A new round was added, expand it
      const newRoundIndex = rounds.length - 1;
      const newRoundValue = `round-${newRoundIndex}`;
      if (!expandedRounds.includes(newRoundValue)) {
        setExpandedRounds(prev => [...prev, newRoundValue]);
      }
    }
    prevRoundsLength.current = rounds.length;
  }, [rounds.length, expandedRounds]);

  // Auto-scroll to bottom after a new round is added
  useEffect(() => {
    if (rounds.length > prevRoundsLength.current) {
      setTimeout(() => {
        if (roundsListRef.current) {
          roundsListRef.current.scrollTo({
            top: roundsListRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 500);
    }

    setRoundsState(rounds);
  }, [rounds.length]);

  const addNewRound = () => {
    const roundNumber = rounds.length + 1;
    const roundNames = [
      'First',
      'Second',
      'Third',
      'Fourth',
      'Fifth',
      'Sixth',
      'Seventh',
      'Eighth',
      'Ninth',
      'Tenth',
    ];
    const defaultName =
      roundNumber <= roundNames.length
        ? `${roundNames[roundNumber - 1]} round`
        : `Round ${roundNumber}`;

    const newRound: BettingRound = {
      roundName: defaultName,
      mechanism: PickMechanism.DEFAULT,
      lockDate: null,
      lockTime: undefined,
      lockTimezone: undefined,
      options: [{ option: 'Option 1' }, { option: 'Option 2' }],
    };

    const updatedRounds = [...roundsState, newRound];

    setRoundsState(updatedRounds);
    onRoundsChange([...rounds, newRound]);
  };

  const updateRoundName = (roundIndex: number, newName: string) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].roundName = newName;
    setRoundsState(updatedRounds);
    onRoundsChange(updatedRounds);
  };

  const updateLockDate = (roundIndex: number, newDate: Date | null) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].lockDate = newDate;
    onRoundsChange(updatedRounds);
  };

  const updateLockTime = (roundIndex: number, newTime: string) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].lockTime = newTime;
    onRoundsChange(updatedRounds);
  };

  const updateLockTimezone = (roundIndex: number, newTimezone: string) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].lockTimezone = newTimezone;
    onRoundsChange(updatedRounds);
  };

  const updateCategory = (roundIndex: number, newCategory: BettingCategory) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].category = newCategory;
    onRoundsChange(updatedRounds);
  };

  const updateBetRoundType = (roundIndex: number, newType: BetRoundType) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].betRoundType = newType;

    // Auto-set mechanism to SENTIMENT when OPINION is selected
    if (newType === BetRoundType.OPINION) {
      updatedRounds[roundIndex].mechanism = PickMechanism.SENTIMENT;
    }

    onRoundsChange(updatedRounds);
  };

  const updateMechanism = (roundIndex: number, newMechanism: PickMechanism) => {
    const updatedRounds = [...rounds];
    const round = updatedRounds[roundIndex];
    updatedRounds[roundIndex].mechanism = newMechanism;

    // Auto-trim options if switching to SENTIMENT with more than 5 options
    if (newMechanism === PickMechanism.SENTIMENT && round.options.length > MAX_SENTIMENT_OPTIONS) {
      const removedCount = round.options.length - MAX_SENTIMENT_OPTIONS;
      updatedRounds[roundIndex].options = round.options.slice(0, MAX_SENTIMENT_OPTIONS);
      toast({
        title: 'Options Trimmed',
        description: `Removed ${removedCount} option(s) to comply with sentiment pick maximum of ${MAX_SENTIMENT_OPTIONS}.`,
      });
    }

    // Clear lock date and time if switching to SENTIMENT
    if (newMechanism === PickMechanism.SENTIMENT) {
      updatedRounds[roundIndex].lockDate = null;
      updatedRounds[roundIndex].lockTime = null;
      updatedRounds[roundIndex].lockTimezone = null;
    }

    onRoundsChange(updatedRounds);
  };

  const deleteRound = (roundIndex: number) => {
    const updatedRounds = rounds.filter((_, index) => index !== roundIndex);
    setRoundsState(updatedRounds);
    onRoundsChange(updatedRounds);
  };

  const addNewOption = (roundIndex: number) => {
    const round = rounds[roundIndex];

    // Check if sentiment mechanism with max options
    if (
      round.mechanism === PickMechanism.SENTIMENT &&
      round.options.length >= MAX_SENTIMENT_OPTIONS
    ) {
      toast({
        title: 'Maximum Options Reached',
        description: `Sentiment picks can have a maximum of ${MAX_SENTIMENT_OPTIONS} options.`,
        variant: 'destructive',
      });
      return;
    }

    const optionNumber = round.options.length + 1;
    const newOptionId =
      TEMP_OPTION_PREFIX + Date.now().toString() + Math.random().toString(36).slice(2);
    const newOption: BettingOption = {
      optionId: newOptionId,
      option: `Option ${optionNumber}`,
    };

    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options = [...round.options, newOption];

    setRoundsState(updatedRounds);
    onRoundsChange(updatedRounds);

    // Expand the round when adding a new option
    const roundValue = `round-${roundIndex}`;
    if (!expandedRounds.includes(roundValue)) {
      setExpandedRounds([...expandedRounds, roundValue]);
    }

    // Remove error for this round if present
    if (errorRounds.includes(roundIndex) && onErrorRoundsChange) {
      onErrorRoundsChange(errorRounds.filter(idx => idx !== roundIndex));
    }

    // Set last added option for scrolling using optionId
    setLastAddedOption({ roundIndex, optionId: newOptionId });
  };

  // Function to edit option name
  const updateOptionName = (roundIndex: number, optionIndex: number, newName: string) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options[optionIndex].option = newName;
    setRoundsState(updatedRounds);
    onRoundsChange(updatedRounds);
  };

  // Function to delete option
  const deleteOption = (roundIndex: number, optionIndex: number) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options = updatedRounds[roundIndex].options.filter(
      (_, index) => index !== optionIndex
    );
    setRoundsState(updatedRounds);
    onRoundsChange(updatedRounds);
  };

  // Function to toggle round expand and collapse
  const toggleRoundExpansion = (roundIndex: number) => {
    const roundValue = `round-${roundIndex}`;
    if (expandedRounds.includes(roundValue)) {
      setExpandedRounds(expandedRounds.filter(value => value !== roundValue));
    } else {
      setExpandedRounds([...expandedRounds, roundValue]);
    }
  };

  const getRoundValue = (index: number) => `round-${index}`;

  const duplicateRound = (roundIndex: number) => {
    const round = rounds[roundIndex];
    const newRound: BettingRound = {
      roundName: round.roundName,
      category: round.category,
      betRoundType: round.betRoundType,
      mechanism: round.mechanism,
      lockDate: round.lockDate || null,
      lockTime: round.lockTime,
      lockTimezone: round.lockTimezone,
      options: round.options.map(opt => ({ option: opt.option })),
    };
    setRoundsState([...rounds, newRound]);
    onRoundsChange([...rounds, newRound]);
  };

  const getRoundErrors = (roundIndex: number): ValidationError[] => {
    return validationErrors?.filter(error => error.roundIndex === roundIndex) || [];
  };

  const getOptionErrors = (roundIndex: number, optionIndex: number): ValidationError[] => {
    return (
      validationErrors?.filter(
        error => error.roundIndex === roundIndex && error.optionIndex === optionIndex
      ) || []
    );
  };

  return (
    <div className="flex flex-col space-y-4 h-full" style={{ minHeight: 0 }}>
      {rounds.length > 0 ? (
        <div className="min-h-0">
          <div
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 390px)', minHeight: 0 }}
            ref={roundsListRef}
          >
            {rounds.map((round, roundIndex) => {
              const isNotCreatedStatus =
                statusMap && round.roundId
                  ? statusMap?.[round.roundId] !== BettingRoundStatus.CREATED
                  : false;
              const roundErrors = getRoundErrors(roundIndex);
              const hasRoundError = roundErrors.some(error => error.type === 'round');

              return (
                <div
                  key={`round-${roundIndex}`}
                  ref={el => (roundRefs.current[roundIndex] = el)}
                  data-round-index={roundIndex}
                >
                  <div className="overflow-x-auto flex flex-col lg:flex-row rounded-xl overflow-hidden border border-[#191D24]">
                    <Table
                      className="w-full table-fixed overflow-hidden bg-transparent"
                      style={{
                        background: 'transparent',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                      }}
                    >
                      <TableBody>
                        {/* Round header row */}
                        <TableRow
                          className={`bg-[#141414] border-b border-[#191D24] ${hasRoundError ? 'border-destructive' : ''}`}
                          style={{ height: 57, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                        >
                          <TableCell
                            className="border-none px-0 py-0 w-full"
                            style={{ borderTopLeftRadius: 12, maxWidth: 'calc(100% - 56px)' }}
                          >
                            <div
                              className="flex items-center justify-between px-4 w-full"
                              style={{ height: 57 }}
                            >
                              <div className="flex items-center gap-2 group min-w-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-white hover:bg-[#272727] px-2 py-1"
                                  style={{ minWidth: 32 }}
                                  onClick={() => toggleRoundExpansion(roundIndex)}
                                >
                                  {expandedRounds.includes(getRoundValue(roundIndex)) ? '▼' : '▶'}
                                </Button>
                                <InlineEditable
                                  title="Edit Round Name"
                                  value={round.roundName}
                                  isNotCreatedStatus={isNotCreatedStatus}
                                  onSave={newName => updateRoundName(roundIndex, newName)}
                                  className={`text-white font-medium truncate ${hasRoundError ? 'text-destructive' : ''}`}
                                  style={{
                                    fontSize: '16px',
                                    color: hasRoundError ? '#ef4444' : '#FFFFFFBF',
                                    maxWidth: '100%',
                                  }}
                                  minLength={2}
                                />
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  type="button"
                                  className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ height: 33, fontSize: '16px', fontWeight: 500 }}
                                  disabled={
                                    isSaving ||
                                    (round.mechanism === PickMechanism.SENTIMENT &&
                                      round.options.length >= MAX_SENTIMENT_OPTIONS)
                                  }
                                  onClick={() => {
                                    if (isNotCreatedStatus) {
                                      setAlertDialogIndex(roundIndex);
                                    } else {
                                      addNewOption(roundIndex);
                                    }
                                  }}
                                  title={
                                    round.mechanism === PickMechanism.SENTIMENT &&
                                    round.options.length >= MAX_SENTIMENT_OPTIONS
                                      ? `Maximum ${MAX_SENTIMENT_OPTIONS} options for sentiment picks`
                                      : ''
                                  }
                                >
                                  + New option
                                </Button>
                                {alertDialogIndex === roundIndex && (
                                  <AlertDialog
                                    open={true}
                                    onOpenChange={open => {
                                      if (!open) setAlertDialogIndex(null);
                                    }}
                                  >
                                    <AlertDialogContent className="border border-primary">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cannot add new option</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This round is already started by admin.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel
                                          onClick={() => setAlertDialogIndex(null)}
                                        >
                                          Cancel
                                        </AlertDialogCancel>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <Button
                                  type="button"
                                  className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
                                  style={{ height: 33, fontSize: '16px', fontWeight: 500 }}
                                  disabled={isSaving}
                                  onClick={() => duplicateRound(roundIndex)}
                                >
                                  <Copy className="h-4 w-4 mr-1" /> Duplicate
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className="border-none p-0 w-14"
                            style={{ borderTopRightRadius: 12, width: 56 }}
                          >
                            <div
                              className="flex items-center justify-center h-full"
                              style={{ minHeight: 57 }}
                            >
                              <DeleteBettingDialog
                                title="Delete Round"
                                message={`Deleting this round will delete all picks options related with this round. Are you sure?`}
                                onConfirm={() => deleteRound(roundIndex)}
                                isNotCreatedStatus={isNotCreatedStatus}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Round name error message */}
                        {hasRoundError && (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="border-none px-4 py-2 !text-destructive text-xs"
                            >
                              {roundErrors.find(error => error.type === 'round')?.message}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell colSpan={2} className="border-none px-4 py-2">
                            <div className="space-y-2">
                              <div>
                                <label className="text-sm font-medium text-white mb-2 block">
                                  Category
                                </label>
                                <Select
                                  value={round.category || BettingCategory.OTHER}
                                  onValueChange={(value: BettingCategory) =>
                                    updateCategory(roundIndex, value)
                                  }
                                >
                                  <SelectTrigger className="w-full bg-[#1a1a1a] border-[#2a2a2a] text-white">
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                                    {Object.values(BettingCategory).map(cat => (
                                      <SelectItem
                                        key={cat}
                                        value={cat}
                                        className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
                                      >
                                        {getCategoryLabel(cat)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white mb-2 block">
                                  Type
                                </label>
                                <Select
                                  value={round.betRoundType || BetRoundType.PICK}
                                  onValueChange={(value: BetRoundType) =>
                                    updateBetRoundType(roundIndex, value)
                                  }
                                >
                                  <SelectTrigger className="w-full bg-[#1a1a1a] border-[#2a2a2a] text-white">
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                                    {Object.values(BetRoundType).map(type => (
                                      <SelectItem
                                        key={type}
                                        value={type}
                                        className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
                                      >
                                        {getBetRoundTypeLabel(type)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white mb-2 block">
                                  Pick Mechanism
                                </label>
                                <Select
                                  value={round.mechanism || PickMechanism.DEFAULT}
                                  onValueChange={(value: PickMechanism) =>
                                    updateMechanism(roundIndex, value)
                                  }
                                  disabled={!!round.roundId}
                                >
                                  <SelectTrigger
                                    className={`w-full bg-[#1a1a1a] border-[#2a2a2a] text-white ${round.roundId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <SelectValue placeholder="Select a mechanism" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                                    {Object.values(PickMechanism).map(mechanism => (
                                      <SelectItem
                                        key={mechanism}
                                        value={mechanism}
                                        className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
                                      >
                                        {getPickMechanismLabel(mechanism as PickMechanism)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {round.roundId && (
                                  <p className="text-xs text-yellow-400/70 mt-1">
                                    Pick mechanism cannot be changed after creation
                                  </p>
                                )}
                              </div>
                              {round.mechanism === PickMechanism.SENTIMENT && (
                                <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-3 space-y-2">
                                  <div className="flex gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-300 space-y-1">
                                      {SENTIMENT_REVEAL_RULES.map((rule, idx) => (
                                        <div key={idx}>{rule}</div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-xs text-blue-400 mt-2">
                                    Maximum {MAX_SENTIMENT_OPTIONS} options allowed for sentiment
                                    picks.
                                  </div>
                                </div>
                              )}
                              {editStreamId && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  Note: When editing, the actual scheduled time is converted and
                                  displayed in your current timezone. If editing the time, verify
                                  correct timezone is set before saving.
                                </p>
                              )}
                              {round.mechanism !== PickMechanism.SENTIMENT && (
                                <CalendarDatePicker
                                  label={'Optional Auto Lock Date'}
                                  error={
                                    roundErrors.find(
                                      error =>
                                        error.type === 'round' &&
                                        error.message.includes('Auto lock')
                                    )?.message || ''
                                  }
                                  isLive={false}
                                  isUploading={false}
                                  onClick={e => {}}
                                  dateVal={round.lockDate}
                                  timeVal={round.lockTime}
                                  timezoneVal={round.lockTimezone}
                                  onChange={newData => {
                                    updateLockDate(roundIndex, newData.date);
                                    updateLockTime(roundIndex, newData.time);
                                    // Auto-set timezone to user's local timezone if not already set
                                    if (newData.date && !round.lockTimezone) {
                                      updateLockTimezone(
                                        roundIndex,
                                        Intl.DateTimeFormat().resolvedOptions().timeZone
                                      );
                                    }
                                  }}
                                  onChangeDate={newDate => {
                                    updateLockDate(roundIndex, newDate);
                                    // Auto-set timezone to user's local timezone if not already set
                                    if (newDate && !round.lockTimezone) {
                                      updateLockTimezone(
                                        roundIndex,
                                        Intl.DateTimeFormat().resolvedOptions().timeZone
                                      );
                                    }
                                  }}
                                  onChangeTime={newTime => {
                                    updateLockTime(roundIndex, newTime.target.value);
                                  }}
                                  onChangeTimezone={newTimezone => {
                                    updateLockTimezone(roundIndex, newTimezone);
                                  }}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Options rows */}
                        {expandedRounds.includes(getRoundValue(roundIndex)) &&
                          (round.options.length > 0 ? (
                            round.options.map((option, optionIndex) => {
                              const optionErrors = getOptionErrors(roundIndex, optionIndex);
                              const hasOptionError = optionErrors.length > 0;

                              return (
                                <TableRow
                                  key={option.optionId || `option-${roundIndex}-${optionIndex}`}
                                  ref={el => {
                                    if (!optionRefs.current[roundIndex])
                                      optionRefs.current[roundIndex] = [];
                                    optionRefs.current[roundIndex][optionIndex] = el;
                                    if (
                                      el &&
                                      lastAddedOption &&
                                      lastAddedOption.roundIndex === roundIndex &&
                                      lastAddedOption.optionId.startsWith(TEMP_OPTION_PREFIX) &&
                                      lastAddedOption.optionId === option.optionId
                                    ) {
                                      setTimeout(() => {
                                        const container = roundsListRef.current;
                                        if (container && el) {
                                          el.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'nearest',
                                            inline: 'nearest',
                                          });
                                        }
                                        setTimeout(() => {
                                          const updated = [...rounds];
                                          const options = updated[roundIndex]?.options;
                                          if (options) {
                                            const idx = options.findIndex(
                                              opt => opt.optionId === option.optionId
                                            );
                                            if (idx !== -1) {
                                              // Remove the temporary optionId after scrolling
                                              const newOpt = { ...options[idx] };
                                              delete newOpt.optionId;
                                              options[idx] = newOpt;
                                            }
                                          }

                                          setRoundsState(updated);
                                          onRoundsChange(updated);
                                        }, 600);
                                        setLastAddedOption(null);
                                      }, 500);
                                    }
                                  }}
                                  className="bg-transparent"
                                  style={{ height: 72, borderRadius: 0 }}
                                >
                                  <TableCell
                                    className="border-t border-b border-[#191D24] px-4 py-2 w-full"
                                    style={{
                                      borderRadius: 0,
                                      maxWidth: 'calc(100% - 56px)',
                                      borderTopWidth: 1,
                                      borderBottomWidth: 1,
                                      borderColor: '#191D24',
                                    }}
                                  >
                                    <div
                                      className="flex items-center gap-2 group min-w-0 h-full"
                                      style={{ height: 72 }}
                                    >
                                      <div
                                        className="flex items-center w-full"
                                        style={{
                                          height: 44,
                                          background: '#272727',
                                          borderRadius: 8,
                                          paddingLeft: 16,
                                          paddingRight: 16,
                                          border: 'none',
                                        }}
                                      >
                                        <InlineEditable
                                          title="Edit Option Name"
                                          isNotCreatedStatus={isNotCreatedStatus}
                                          value={option.option}
                                          onSave={newName =>
                                            updateOptionName(roundIndex, optionIndex, newName)
                                          }
                                          className="text-white text-sm font-normal truncate"
                                          style={{ color: '#FFFFFFBF', maxWidth: '100%' }}
                                          minLength={1}
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell
                                    className="border-t border-b border-[#191D24] p-0 w-14"
                                    style={{
                                      borderRadius: 0,
                                      width: 56,
                                      borderTopWidth: 1,
                                      borderBottomWidth: 1,
                                      borderColor: '#191D24',
                                    }}
                                  >
                                    <div
                                      className="flex items-center justify-center h-full"
                                      style={{ minHeight: 72 }}
                                    >
                                      <DeleteBettingDialog
                                        title="Delete Option"
                                        message={`Delete this option from round ${round.roundName}`}
                                        onConfirm={() => deleteOption(roundIndex, optionIndex)}
                                        isNotCreatedStatus={isNotCreatedStatus}
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow className="bg-transparent border-b border-[#191D24]">
                              <TableCell
                                colSpan={2}
                                className="border-none px-4 py-4 text-center text-destructive text-sm"
                              >
                                No options added yet. Click "+ New option" to add options.
                              </TableCell>
                            </TableRow>
                          ))}
                        {/* Option name error messages */}
                        {round.options.map((option, optionIndex) => {
                          const optionErrors = getOptionErrors(roundIndex, optionIndex);
                          return optionErrors.map((error, errorIndex) => (
                            <TableRow
                              key={`option-error-${roundIndex}-${optionIndex}-${errorIndex}`}
                            >
                              <TableCell
                                colSpan={2}
                                className="border-none px-4 py-2 !text-destructive text-xs"
                              >
                                {error.message}
                              </TableCell>
                            </TableRow>
                          ));
                        })}
                        {/* Error message for round with 0 options */}
                        {errorRounds.includes(roundIndex) && (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="border-none px-4 py-2 !text-destructive text-xs"
                            >
                              Each round must have at least two options.
                            </TableCell>
                          </TableRow>
                        )}
                        {validationErrors?.find(
                          error => error.type === 'option' && error.roundIndex === roundIndex
                        ) && (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="border-none px-4 py-2 !text-destructive text-xs"
                            >
                              {
                                validationErrors.find(
                                  error =>
                                    error.type === 'option' && error.roundIndex === roundIndex
                                )?.message
                              }
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {expandedRounds.includes(getRoundValue(roundIndex)) && (
                      <div className="p-4 flex flex-col gap-2 w-full max-w-96">
                        <h3>Preview</h3>
                        <div className="mx-auto w-full">
                          {roundsState[roundIndex] && (
                            <BetCardPreview
                              {...betCardInfo}
                              name={roundsState[roundIndex].roundName}
                              category={roundsState[roundIndex].category || BettingCategory.OTHER}
                              options={roundsOptionsPreview[roundIndex]}
                              totalPot={{
                                streamCoins: 0,
                                goldCoins: 0,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Separator between rounds */}
                  {roundIndex < rounds.length - 1 && (
                    <div className="bg-[#232323] h-[2px] w-full my-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No picks rounds created yet. Click "+ New round" to get started.
        </div>
      )}
      {createStream ? (
        <div className="flex justify-center mt-8">
          <Button
            type="submit"
            className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[140px] h-[40px]"
            style={{ borderRadius: '10px' }}
            onClick={async e => {
              e.preventDefault();
              await handleCreateStream();
            }}
            disabled={isSaving}
          >
            {editStreamId
              ? isSaving
                ? 'Saving...'
                : 'Save'
              : isSaving
                ? 'Creating...'
                : 'Create stream'}
          </Button>
        </div>
      ) : (
        <div className="flex justify-center mt-8">
          <Button
            type="button"
            className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
            style={{ height: 44, fontSize: '16px', fontWeight: 500 }}
            disabled={isSaving}
            onClick={addNewRound}
          >
            + New round
          </Button>
        </div>
      )}
      {/* New round button at bottom center */}
    </div>
  );
}

export function validateRounds(rounds: BettingRound[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for duplicate round names
  const roundNames = rounds.map(round => round.roundName.toLowerCase().trim());
  const duplicateRoundNames = new Set<string>();
  roundNames.forEach((name, index) => {
    if (roundNames.indexOf(name) !== index) {
      duplicateRoundNames.add(name);
    }
  });

  rounds.forEach((round, roundIndex) => {
    // if (duplicateRoundNames.has(round.roundName.toLowerCase().trim())) {
    //   errors.push({
    //     type: 'round',
    //     roundIndex,
    //     message: 'Round name must be unique'
    //   });
    // }

    // Check if auto-lock date is in the past
    if (round.lockDate && round.lockTime) {
      if (isScheduledTimeInPast(round.lockDate, round.lockTime, round.lockTimezone)) {
        errors.push({
          type: 'round',
          roundIndex,
          message: 'Auto lock time must be in the future',
        });
      }
    }

    // Check for duplicate option names within the same round
    const optionNames = round.options.map(option => option.option.toLowerCase().trim());
    const nameCounts = optionNames.reduce(
      (acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const hasDuplicate = Object.values(nameCounts).some(count => count > 1);
    if (hasDuplicate) {
      errors.push({
        type: 'option',
        roundIndex,
        message: 'Option names must be unique within the same round',
      });
    }
  });

  return errors;
}
