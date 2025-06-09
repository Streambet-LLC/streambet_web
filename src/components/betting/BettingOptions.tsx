import { Button } from '@/components/ui/button';

interface BettingOptionsProps {
  options: string[];
  selectedOption: string;
  onOptionSelect: (option: string) => void;
}

export const BettingOptions = ({
  options,
  selectedOption,
  onOptionSelect,
}: BettingOptionsProps) => {
  if (!options || options.length === 0) return null;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option: string, index: number) => (
        <Button
          key={index}
          variant={selectedOption === option ? 'default' : 'secondary'}
          className="w-full h-12 font-medium"
          onClick={() => onOptionSelect(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
};
