import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, Unlock, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface BettingManagementSectionProps {
  stream: {
    id: string;
    betting_locked?: boolean;
    betting_outcome?: string | null;
    betting_options?: string[];
    total_bets?: number | null;
  };
  selectedOutcome: string;
  onOutcomeChange: (value: string) => void;
  onLockBets: () => void;
  onDeclareWinner: () => void;
  onUnlockBets?: () => void;
  processing?: boolean;
}

export const BettingManagementSection = ({
  stream,
  selectedOutcome,
  onOutcomeChange,
  onLockBets,
  onDeclareWinner,
  onUnlockBets,
  processing = false,
}: BettingManagementSectionProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!stream.id) return;

    console.log('Setting up realtime subscription for stream:', stream.id);

    const channel = supabase
      .channel('streams_db_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${stream.id}`,
        },
        payload => {
          console.log('Stream update received:', payload);
        }
      )
      .subscribe(status => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [stream.id]);

  const handleDeclareWinner = async () => {
    if (!selectedOutcome) {
      toast({
        title: 'Error',
        description: 'Please select a winning outcome',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Processing',
        description: 'Processing payouts, please wait...',
      });

      onDeclareWinner();
    } catch (error) {
      console.error('Error declaring winner:', error);
      toast({
        title: 'Error',
        description: 'Failed to declare winner and process payouts',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="pt-6 border-t">
      <h4 className="text-lg font-semibold mb-4">Betting Management</h4>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium">Total Bets</h5>
            <p className="text-2xl font-bold">{stream.total_bets || 0}</p>
          </div>

          {!stream.betting_locked ? (
            <Button onClick={onLockBets} variant="destructive" disabled={processing}>
              <Lock className="w-4 h-4 mr-2" />
              Lock Betting
            </Button>
          ) : (
            onUnlockBets && (
              <Button onClick={onUnlockBets} variant="outline" disabled={processing}>
                <Unlock className="w-4 h-4 mr-2" />
                Unlock Betting
              </Button>
            )
          )}
        </div>

        {stream.betting_locked && !stream.betting_outcome && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Winner</Label>
              <Select value={selectedOutcome} onValueChange={onOutcomeChange} disabled={processing}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose winning outcome" />
                </SelectTrigger>
                <SelectContent>
                  {stream.betting_options?.map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleDeclareWinner}
              className="w-full"
              disabled={!selectedOutcome || processing}
            >
              {processing ? 'Processing Payouts...' : 'Declare Winner & Process Payouts'}
            </Button>
          </div>
        )}

        {stream.betting_outcome && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="space-y-4">
              <div className="flex items-center text-amber-700">
                <span className="font-semibold">
                  Betting round completed. Winner: {stream.betting_outcome}
                </span>
              </div>

              {onUnlockBets && (
                <Button
                  onClick={onUnlockBets}
                  variant="outline"
                  className="w-full border-amber-500 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                  disabled={processing}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Start New Betting Round
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
