import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';

const Withdraw = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isFetching, session } = useAuthContext();

  // Redirect if not logged in
  useEffect(() => {
    if (!isFetching && session === null) {
      navigate('/login?redirect=/withdraw');
    }
  }, [isFetching, session, navigate]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['session'] });
  };

  if (!session) return null;

  return (
    <MainLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">Withdraw Funds</h1>
        <span>Withdraw page</span>
      </div>
    </MainLayout>
  );
};

export default Withdraw;
