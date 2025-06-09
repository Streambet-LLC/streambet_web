import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const LoginPrompt = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-muted rounded-lg">
      <p className="text-lg font-medium">Want to place a bet?</p>
      <Button onClick={() => navigate('/login')}>Log in to Place Bet</Button>
    </div>
  );
};
