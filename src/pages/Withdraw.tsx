import { Navigation } from '@/components/Navigation';
import { WithdrawForm } from '@/components/withdraw/WithdrawForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Withdraw = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (session === null) {
      navigate('/login');
    }
  }, [session, navigate]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  if (!session || !profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container pt-24 pb-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-8">Withdraw Funds</h1>
          <WithdrawForm currentBalance={profile.wallet_balance || 0} onSuccess={handleSuccess} />
        </div>
      </main>
    </div>
  );
};

export default Withdraw;
