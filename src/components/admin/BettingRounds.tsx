import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteBettingDialog } from './DeleteBettingDialog';
import { InlineEditable } from './InlineEditable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Edit } from 'lucide-react';

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
}

export function BettingRounds({ rounds, onRoundsChange }: BettingRoundsProps) {
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

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Header with label and New Round button */}
        <div className="flex flex-col space-y-3">
          <span className="text-white font-medium" style={{ fontSize: '18px', fontWeight: 500 }}>
            Betting rounds
          </span>
          <Button
            type="button"
            className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-full"
            style={{ borderRadius: '10px' }}
            onClick={addNewRound}
          >
            New round
          </Button>
        </div>

        {/* Mobile Card View */}
        {rounds.length > 0 && (
          <div className="space-y-4">
            {rounds.map((round, roundIndex) => (
              <div key={roundIndex} className="border border-[#272727] rounded-lg bg-[#141414] p-4">
                {/* Round Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 group">
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
                      className="bg-[#272727] text-white font-medium px-3 py-1 rounded-lg border-none text-sm"
                      style={{ fontSize: '16px', fontWeight: 500 }}
                      onClick={() => addNewOption(roundIndex)}
                    >
                      + New option
                    </Button>
                    <DeleteBettingDialog
                      title="Delete Round"
                      message={`Deleting this round will delete all betting options related with this round. Are you sure?`}
                      onConfirm={() => deleteRound(roundIndex)}
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="space-y-2">
                  {round.options.map((option, optionIndex) => (
                    <div 
                      key={optionIndex} 
                      className="flex items-center justify-between py-2 px-3 bg-[#272727] rounded-lg"
                    >
                      <div className="flex items-center gap-2 group">
                        <InlineEditable
                          value={option.option}
                          onSave={(newName) => updateOptionName(roundIndex, optionIndex, newName)}
                          className="text-white text-sm font-normal"
                          style={{ color: '#FFFFFFBF' }}
                          minLength={3}
                        />
                        <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <DeleteBettingDialog
                        title="Delete Option"
                        message={`Delete this option from round ${round.roundName}`}
                        onConfirm={() => deleteOption(roundIndex, optionIndex)}
                      />
                    </div>
                  ))}
                  {round.options.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No options added yet. Click "+ New option" to add options.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {rounds.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No betting rounds created yet. Click "New round" to get started.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with label and New Round button */}
      <div className="flex items-center justify-between">
        <span className="text-white font-medium" style={{ fontSize: '18px', fontWeight: 500 }}>
          Betting rounds
        </span>
        <Button
          type="button"
          className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none"
          style={{ borderRadius: '10px' }}
          onClick={addNewRound}
        >
          New round
        </Button>
      </div>

      {/* Desktop Table View */}
      {rounds.length > 0 && (
        <div className="border border-[#272727] rounded-lg overflow-hidden">
          <Table>
            <TableBody>
              {rounds.map((round, roundIndex) => (
                <>
                  {/* Round Row */}
                  <TableRow key={`round-${roundIndex}`} className="bg-[#141414] hover:bg-[#1a1a1a]" style={{ height: '57px' }}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 group">
                        <InlineEditable
                          value={round.roundName}
                          onSave={(newName) => updateRoundName(roundIndex, newName)}
                          className="text-white font-medium"
                          style={{ fontSize: '16px', color: '#FFFFFFBF' }}
                          minLength={3}
                        />
                        <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">
                          {round.options.length} option{round.options.length !== 1 ? 's' : ''}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-[#272727]"
                          onClick={() => toggleRoundExpansion(roundIndex)}
                        >
                          {expandedRounds.includes(getRoundValue(roundIndex)) ? '▼' : '▶'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 pr-6">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          className="bg-[#272727] text-white font-medium px-4 py-2 rounded-lg border-none hover:bg-[#3a3a3a] transition-colors"
                          style={{ fontSize: '16px', fontWeight: 500 }}
                          onClick={() => addNewOption(roundIndex)}
                        >
                          + New option
                        </Button>
                        <DeleteBettingDialog
                          title="Delete Round"
                          message={`Deleting this round will delete all betting options related with this round. Are you sure?`}
                          onConfirm={() => deleteRound(roundIndex)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Options Rows */}
                  {expandedRounds.includes(getRoundValue(roundIndex)) && (
                    <>
                      {round.options.map((option, optionIndex) => (
                        <TableRow key={`option-${roundIndex}-${optionIndex}`} className="hover:bg-[#2a2a2a]" style={{ height: '72px' }}>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2 group">
                              <InlineEditable
                                value={option.option}
                                onSave={(newName) => updateOptionName(roundIndex, optionIndex, newName)}
                                className="text-white text-sm font-normal"
                                style={{ color: '#FFFFFFBF' }}
                                minLength={3}
                              />
                              <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {/* Empty cell - no content needed */}
                          </TableCell>
                          <TableCell className="py-3 pr-6">
                            <div className="flex items-center justify-end">
                              <DeleteBettingDialog
                                title="Delete Option"
                                message={`Delete this option from round ${round.roundName}`}
                                onConfirm={() => deleteOption(roundIndex, optionIndex)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {round.options.length === 0 && (
                        <TableRow style={{ height: '72px' }}>
                          <TableCell colSpan={3} className="py-4 text-center text-gray-500">
                            No options added yet. Click "+ New option" to add options.
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rounds.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No betting rounds created yet. Click "New round" to get started.
        </div>
      )}
    </div>
  );
} 
