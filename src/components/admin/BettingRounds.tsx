import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteBettingDialog } from './DeleteBettingDialog';
import { InlineEditable } from './InlineEditable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Edit, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
}

export function BettingRounds({ rounds, onRoundsChange, editStreamId, showValidationErrors, errorRounds = [] }: BettingRoundsProps) {
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
      {/* Betting rounds list */}
      {rounds.length > 0 ? (
        <div className="space-y-8">
          {rounds.map((round, roundIndex) => (
            <div key={`round-wrap-${roundIndex}`}>
              <div
                className={`border rounded-lg bg-[#141414] p-4 relative ${errorRounds.includes(roundIndex) ? 'border-destructive' : 'border-[#272727]'}`}
                style={{ marginBottom: 0 }}
              >
                {/* Round header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 group">
                    {/* Accordion toggle */}
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
                      className="text-white font-medium"
                      style={{ fontSize: '16px', color: '#FFFFFFBF' }}
                      minLength={3}
                    />
                    <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2">
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
                    <DeleteBettingDialog
                      title="Delete Round"
                      message={`Deleting this round will delete all betting options related with this round. Are you sure?`}
                      onConfirm={() => deleteRound(roundIndex)}
                    />
                  </div>
                </div>
                {/* Accordion: show options if expanded */}
                {expandedRounds.includes(getRoundValue(roundIndex)) && (
                  <div className="flex flex-col gap-2">
                    {round.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center"
                      >
                        <div className="flex items-center gap-2 bg-[#272727] rounded-lg py-2 px-3 flex-1 min-w-0">
                          <InlineEditable
                            value={option.option}
                            onSave={(newName) => updateOptionName(roundIndex, optionIndex, newName)}
                            className="text-white text-sm font-normal truncate"
                            style={{ color: '#FFFFFFBF', maxWidth: '180px' }}
                            minLength={3}
                          />
                          <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center ml-2">
                          <DeleteBettingDialog
                            title="Delete Option"
                            message={`Delete this option from round ${round.roundName}`}
                            onConfirm={() => deleteOption(roundIndex, optionIndex)}
                          />
                        </div>
                      </div>
                    ))}
                    {round.options.length === 0 && (
                      <div className="text-center py-4 text-destructive text-sm">
                        No options added yet. Click "+ New option" to add options.
                      </div>
                    )}
                  </div>
                )}
                {/* Error message for round with 0 options */}
                {errorRounds.includes(roundIndex) && (
                  <div className="text-destructive text-xs mt-2">
                    Each round must have at least one option.
                  </div>
                )}
              </div>
              {/* Separator between rounds */}
              {roundIndex < rounds.length - 1 && <Separator className="mt-8 mb-6 bg-[#232323]" />}
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
