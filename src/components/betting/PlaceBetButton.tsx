import { Button } from '@/components/ui/button';

interface PlaceBetButtonProps {
  isPlacingBet: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const PlaceBetButton = ({ isPlacingBet, disabled, onClick }: PlaceBetButtonProps) => {
  return (
    <Button
      className="w-full h-12 text-lg font-semibold bg-[#c3f53b] hover:bg-[#b3e535] text-black"
      onClick={onClick}
      disabled={disabled}
    >
      {isPlacingBet ? 'Processing...' : 'Place Bet'}
    </Button>
  );
};
