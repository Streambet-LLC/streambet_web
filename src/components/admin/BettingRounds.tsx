import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { DeleteBettingDialog } from './DeleteBettingDialog';
import { InlineEditable } from './InlineEditable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Edit, Copy } from 'lucide-react';

interface BettingOption {
  optionId?: string;
  option: string;
}

interface BettingRound {
  roundId?: string;
  roundName: string;
  options: BettingOption[];
}

interface BettingRoundsProps {
  rounds: BettingRound[];
  onRoundsChange: (rounds: BettingRound[]) => void;
  editStreamId?: string;
  showValidationErrors?: boolean;
  errorRounds?: number[];
  onErrorRoundsChange?: (errorRounds: number[]) => void;
}

export function BettingRounds({ rounds, onRoundsChange, editStreamId, showValidationErrors, errorRounds = [], onErrorRoundsChange }: BettingRoundsProps) {
  const isMobile = useIsMobile();
  const [expandedRounds, setExpandedRounds] = useState<string[]>([]);

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
    const newOption: BettingOption = {
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
  };

  const updateOptionName = (roundIndex: number, optionIndex: number, newName: string) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options[optionIndex].option = newName;
    onRoundsChange(updatedRounds);
  };

  const deleteOption = (roundIndex: number, optionIndex: number) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex].options = updatedRounds[roundIndex].options.filter((_, index) => index !== optionIndex);
    onRoundsChange(updatedRounds);
  };

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

  return (
    <div className="space-y-4">
      {rounds.length > 0 ? (
        <div className="space-y-2">
          {rounds.map((round, roundIndex) => (
            <div key={`round-${roundIndex}`}>
              <div className="overflow-x-auto">
                <Table
                  className="w-full table-fixed rounded-xl overflow-hidden border border-[#191D24] bg-transparent"
                  style={{ background: 'transparent', borderCollapse: 'separate', borderSpacing: 0 }}
                >
                  <TableBody>
                    {/* Round header row */}
                    <TableRow
                      className="bg-[#141414] border-b border-[#191D24]"
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
                              value={round.roundName}
                              onSave={(newName) => updateRoundName(roundIndex, newName)}
                              className="text-white font-medium truncate"
                              style={{ fontSize: '16px', color: '#FFFFFFBF', maxWidth: '200px' }}
                              minLength={2}
                            />
                            <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              type="button"
                              className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
                              style={{ height: 33, fontSize: '16px', fontWeight: 500 }}
                              onClick={() => addNewOption(roundIndex)}
                            >
                              + New option
                            </Button>
                            <Button
                              type="button"
                              className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
                              style={{ height: 33, fontSize: '16px', fontWeight: 500 }}
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
                            message={`Deleting this round will delete all betting options related with this round. Are you sure?`}
                            onConfirm={() => deleteRound(roundIndex)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Options rows */}
                    {expandedRounds.includes(getRoundValue(roundIndex)) && (
                      round.options.length > 0 ? (
                        round.options.map((option, optionIndex) => (
                          <TableRow
                            key={`option-${roundIndex}-${optionIndex}`}
                            className="bg-transparent border-b border-[#191D24]"
                            style={{ height: 72, borderRadius: 0 }}
                          >
                            <TableCell className="border-none px-4 py-2 w-full" style={{ borderRadius: 0, maxWidth: 'calc(100% - 56px)' }}>
                              <div className="flex items-center gap-2 group min-w-0 h-full" style={{ height: 72 }}>
                                <div className="flex items-center w-full" style={{ height: 44, background: '#272727', borderRadius: 8, paddingLeft: 16, paddingRight: 16 }}>
                                  <InlineEditable
                                    value={option.option}
                                    onSave={(newName) => updateOptionName(roundIndex, optionIndex, newName)}
                                    className="text-white text-sm font-normal truncate"
                                    style={{ color: '#FFFFFFBF', maxWidth: '180px' }}
                                    minLength={2}
                                  />
                                  <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="border-none p-0 w-14" style={{ borderRadius: 0, width: 56 }}>
                              <div className="flex items-center justify-center h-full" style={{ minHeight: 72 }}>
                                <DeleteBettingDialog
                                  title="Delete Option"
                                  message={`Delete this option from round ${round.roundName}`}
                                  onConfirm={() => deleteOption(roundIndex, optionIndex)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="bg-transparent border-b border-[#191D24]">
                          <TableCell colSpan={2} className="border-none px-4 py-4 text-center text-destructive text-sm">
                            No options added yet. Click "+ New option" to add options.
                          </TableCell>
                        </TableRow>
                      )
                    )}
                    {/* Error message for round with 0 options */}
                    {errorRounds.includes(roundIndex) && (
                      <TableRow>
                        <TableCell colSpan={2} className="border-none px-4 py-2 !text-destructive text-xs">
                          Each round must have at least one option.
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
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No betting rounds created yet. Click "+ New round" to get started.
        </div>
      )}
      {/* New round button at bottom center */}
      <div className="flex justify-center mt-8">
        <Button
          type="button"
          className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
          style={{ height: 44, fontSize: '16px', fontWeight: 500 }}
          onClick={addNewRound}
        >
          + New round
        </Button>
      </div>
    </div>
  );
} 
