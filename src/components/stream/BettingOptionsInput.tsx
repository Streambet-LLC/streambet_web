import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, X } from 'lucide-react';

interface BettingOptionsInputProps {
  bettingOptions: string[];
  setBettingOptions: (options: string[]) => void;
}

export const BettingOptionsInput = ({
  bettingOptions,
  setBettingOptions,
}: BettingOptionsInputProps) => {
  const [newOption, setNewOption] = useState('');

  const handleAddOption = () => {
    if (!newOption.trim()) return;

    setBettingOptions([...bettingOptions, newOption.trim()]);
    setNewOption('');
  };

  const removeOption = (index: number) => {
    setBettingOptions(bettingOptions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">Betting Options</label>
      </div>

      {bettingOptions.length > 0 && (
        <div className="space-y-2">
          {bettingOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <span className="flex-1">{option}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {bettingOptions.length < 10 && (
        <div className="flex gap-2">
          <Input
            placeholder="Enter betting option (e.g., 'Green Marble')"
            value={newOption}
            onChange={e => setNewOption(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={handleAddOption}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        </div>
      )}
    </div>
  );
};
