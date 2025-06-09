import { Navigation } from '@/components/Navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { WalletHistory } from '@/components/WalletHistory';

const Transactions = () => {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('Current session:', session);
      return session;
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (session === null) {
      navigate('/login');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container pt-24 pb-8">
        <h1 className="text-3xl font-bold mb-8">Transaction History</h1>
        {session && <WalletHistory session={session} />}
      </main>
    </div>
  );
};

export default Transactions;
