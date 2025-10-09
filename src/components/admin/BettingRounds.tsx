import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { DeleteBettingDialog } from './DeleteBettingDialog';
import { InlineEditable } from './InlineEditable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Edit, Copy } from 'lucide-react';
import { BettingRoundStatus } from '@/enums';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { TEMP_OPTION_PREFIX, cleanTemporaryIds, isTemporaryOptionId, getCleanedRounds } from '@/utils/bettingRoundsUtils';

interface BettingOption {
  optionId?: string;
  option: string;
}

interface BettingRound {
  roundId?: string;
  roundName: string;
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
  createStream?:boolean;
  handleCreateStream?: () => void;
}

export function BettingRounds({ 
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
  handleCreateStream
 }: BettingRoundsProps) {
  const isMobile = useIsMobile();
  const [expandedRounds, setExpandedRounds] = useState<string[]>([]);
  const [alertDialogIndex, setAlertDialogIndex] = useState<number | null>(null);
  const roundRefs = useRef<(HTMLDivElement | null)[]>([]);
  const roundsListRef = useRef<HTMLDivElement | null>(null);
  const prevRoundsLength = useRef<number>(rounds.length);
  const optionRefs = useRef<Array<Array<HTMLTableRowElement | null>>>([]);
  const [lastAddedOption, setLastAddedOption] = useState<{ roundIndex: number; optionId: string } | null>(null);

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
    prevRoundsLength.current = rounds.length;
  }, [rounds.length]);

  const addNewRound = () => {
    const roundNumber = rounds.length + 1;
    const roundNames = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
    const defaultName = roundNumber <= roundNames.length ? `${roundNames[roundNumber - 1]} round` : `Round ${roundNumber}`;
    
    const newRound: BettingRound = {
      roundName: defaultName,
      options: []
    };
    
    onRoundsChange([...rounds, newRound]);
  };

  const updateRoundName = (roundIndex: number, newName: string) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].roundName = newName;
    onRoundsChange(updatedRounds);
  };

  const deleteRound = (roundIndex: number) => {
    const updatedRounds = rounds.filter((_, index) => index !== roundIndex);
    onRoundsChange(updatedRounds);
  };

  const addNewOption = (roundIndex: number) => {
    const round = rounds[roundIndex];
    const optionNumber = round.options.length + 1;
    const newOptionId = TEMP_OPTION_PREFIX + Date.now().toString() + Math.random().toString(36).slice(2);
    const newOption: BettingOption = {
      optionId: newOptionId,
      option: `Option ${optionNumber}`
    };
    
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options = [...round.options, newOption];
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
    onRoundsChange(updatedRounds);
  };

  // Function to delete option
  const deleteOption = (roundIndex: number, optionIndex: number) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options = updatedRounds[roundIndex].options.filter((_, index) => index !== optionIndex);
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
      options: round.options.map(opt => ({ option: opt.option }))
    };
    onRoundsChange([...rounds, newRound]);
  };

  const getRoundErrors = (roundIndex: number): ValidationError[] => {
    return validationErrors?.filter(error => error.roundIndex === roundIndex) || [];
  };

  const getOptionErrors = (roundIndex: number, optionIndex: number): ValidationError[] => {
    return validationErrors?.filter(error => 
      error.roundIndex === roundIndex && 
      error.optionIndex === optionIndex
    ) || [];
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
              const isNotCreatedStatus = statusMap && round.roundId ? statusMap?.[round.roundId] !== BettingRoundStatus.CREATED : false;
              const roundErrors = getRoundErrors(roundIndex);
              const hasRoundError = roundErrors.some(error => error.type === 'round');

              return (
              <div 
                key={`round-${roundIndex}`}
                ref={el => roundRefs.current[roundIndex] = el}
                data-round-index={roundIndex}
              >
                <div className="overflow-x-auto">
                  <Table
                    className="w-full table-fixed rounded-xl overflow-hidden border border-[#191D24] bg-transparent"
                    style={{ background: 'transparent', borderCollapse: 'separate', borderSpacing: 0 }}
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
                          <div className="flex items-center justify-between px-4 w-full" style={{ height: 57 }}>
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
                                onSave={(newName) => updateRoundName(roundIndex, newName)}
                                className={`text-white font-medium truncate ${hasRoundError ? 'text-destructive' : ''}`}
                                style={{ fontSize: '16px', color: hasRoundError ? '#ef4444' : '#FFFFFFBF', maxWidth: '100%' }}
                                minLength={2}
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                type="button"
                                className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
                                style={{ height: 33, fontSize: '16px', fontWeight: 500 }}
                                disabled={isSaving}
                                onClick={() => {
                                  if (isNotCreatedStatus) {
                                    setAlertDialogIndex(roundIndex);
                                  } else {
                                    addNewOption(roundIndex);
                                  }
                                }}
                              >
                                + New option
                              </Button>
                              {alertDialogIndex === roundIndex && (
                                <AlertDialog open={true} onOpenChange={(open) => { if (!open) setAlertDialogIndex(null); }}>
                                  <AlertDialogContent className="border border-primary">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cannot add new option</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This round is already started by admin.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setAlertDialogIndex(null)}>
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
                        <TableCell className="border-none p-0 w-14" style={{ borderTopRightRadius: 12, width: 56 }}>
                          <div className="flex items-center justify-center h-full" style={{ minHeight: 57 }}>
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
                          <TableCell colSpan={2} className="border-none px-4 py-2 !text-destructive text-xs">
                            {roundErrors.find(error => error.type === 'round')?.message}
                          </TableCell>
                        </TableRow>
                      )}
                      {/* Options rows */}
                      {expandedRounds.includes(getRoundValue(roundIndex)) && (
                        round.options.length > 0 ? (
                          round.options.map((option, optionIndex) => {
                            const optionErrors = getOptionErrors(roundIndex, optionIndex);
                            const hasOptionError = optionErrors.length > 0;
                            const optionNameLower = option.option.toLowerCase().trim();
                            const isDuplicateOption = validationErrors?.some(
                              error => error.type === 'option' && error.roundIndex === roundIndex &&
                                round.options.filter(opt => opt.option.toLowerCase().trim() === optionNameLower).length > 1
                            );
                            
                            return (
                            <TableRow
                              key={option.optionId || `option-${roundIndex}-${optionIndex}`}
                              ref={el => {
                                if (!optionRefs.current[roundIndex]) optionRefs.current[roundIndex] = [];
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
                                      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                                    }
                                    setTimeout(() => {
                                      const updated = [...rounds];
                                      const options = updated[roundIndex]?.options;
                                      if (options) {
                                        const idx = options.findIndex(opt => opt.optionId === option.optionId);
                                        if (idx !== -1) {
                                          // Remove the temporary optionId after scrolling
                                          const newOpt = { ...options[idx] };
                                          delete newOpt.optionId;
                                          options[idx] = newOpt;
                                        }
                                      }
                                      onRoundsChange(updated);
                                    }, 600);
                                    setLastAddedOption(null);
                                  }, 500);
                                }
                              }}
                              className={`bg-transparent${isDuplicateOption ? ' border-destructive' : ''}`}
                              style={{ height: 72, borderRadius: 0 }}
                            >
                              <TableCell className={`border-t border-b border-[#191D24] px-4 py-2 w-full${isDuplicateOption ? ' border-destructive' : ''}`} style={{ borderRadius: 0, maxWidth: 'calc(100% - 56px)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: isDuplicateOption ? '#ef4444' : '#191D24' }}>
                                <div className="flex items-center gap-2 group min-w-0 h-full" style={{ height: 72 }}>
                                  <div className={`flex items-center w-full${isDuplicateOption ? ' border-destructive' : ''}`} style={{ height: 44, background: '#272727', borderRadius: 8, paddingLeft: 16, paddingRight: 16, border: isDuplicateOption ? '1px solid #ef4444' : 'none' }}>
                                    <InlineEditable
                                      title="Edit Option Name"
                                      isNotCreatedStatus={isNotCreatedStatus}
                                      value={option.option}
                                      onSave={(newName) => updateOptionName(roundIndex, optionIndex, newName)}
                                      className={`text-white text-sm font-normal truncate${isDuplicateOption ? ' text-destructive' : ''}`}
                                      style={{ color: isDuplicateOption ? '#ef4444' : '#FFFFFFBF', maxWidth: '100%' }}
                                      minLength={2}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={`border-t border-b border-[#191D24] p-0 w-14${isDuplicateOption ? ' border-destructive' : ''}`} style={{ borderRadius: 0, width: 56, borderTopWidth: 1, borderBottomWidth: 1, borderColor: isDuplicateOption ? '#ef4444' : '#191D24' }}>
                                <div className="flex items-center justify-center h-full" style={{ minHeight: 72 }}>
                                  <DeleteBettingDialog
                                    title="Delete Option"
                                    message={`Delete this option from round ${round.roundName}`}
                                    onConfirm={() => deleteOption(roundIndex, optionIndex)}
                                    isNotCreatedStatus={isNotCreatedStatus}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )})
                        ) : (
                          <TableRow className="bg-transparent border-b border-[#191D24]">
                            <TableCell colSpan={2} className="border-none px-4 py-4 text-center text-destructive text-sm">
                              No options added yet. Click "+ New option" to add options.
                            </TableCell>
                          </TableRow>
                        )
                      )}
                      {/* Option name error messages */}
                      {round.options.map((option, optionIndex) => {
                        const optionErrors = getOptionErrors(roundIndex, optionIndex);
                        return optionErrors.map((error, errorIndex) => (
                          <TableRow key={`option-error-${roundIndex}-${optionIndex}-${errorIndex}`}>
                            <TableCell colSpan={2} className="border-none px-4 py-2 !text-destructive text-xs">
                              {error.message}
                            </TableCell>
                          </TableRow>
                        ));
                      })}
                      {/* Error message for round with 0 options */}
                      {errorRounds.includes(roundIndex) && (
                        <TableRow>
                          <TableCell colSpan={2} className="border-none px-4 py-2 !text-destructive text-xs">
                            Each round must have at least two options.
                          </TableCell>
                        </TableRow>
                      )}
                      {validationErrors?.find(error => error.type === 'option' && error.roundIndex === roundIndex) && (
                        <TableRow>
                          <TableCell colSpan={2} className="border-none px-4 py-2 !text-destructive text-xs">
                            {validationErrors.find(error => error.type === 'option' && error.roundIndex === roundIndex)?.message}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Separator between rounds */}
                {roundIndex < rounds.length - 1 && (
                  <div className="bg-[#232323] h-[2px] w-full my-4" />
                )}
              </div>
            )})}
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
            onClick={async (e) => {
                  e.preventDefault();
                  await handleCreateStream();
                  }}
            disabled={isSaving}
            >
            {editStreamId ? (isSaving ? 'Saving...' : 'Save') : (isSaving) ? 'Creating...' : 'Create stream'}
          </Button>
        </div>
       ):
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
      </div>}
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
    // Check for duplicate option names within the same round
    const optionNames = round.options.map(option => option.option.toLowerCase().trim());
    const nameCounts = optionNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const hasDuplicate = Object.values(nameCounts).some(count => count > 1);
    if (hasDuplicate) {
      errors.push({
        type: 'option',
        roundIndex,
        message: 'Option names must be unique within the same round'
      });
    }
  });
  return errors;
} 
