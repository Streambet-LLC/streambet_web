import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getMessage } from '@/utils/helper';
import { Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      toast({ title: 'Invalid link', description: 'No token found in URL', variant: 'destructive' });
      setError('No token found in URL');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(() => {
        toast({ title: 'Email verified', description: 'Email verified please try login now!' });
        navigate('/login');
      })
      .catch((err) => {
        toast({ title: 'Verification failed', description: 'Invalid or expired token', variant: 'destructive' });
        setError(getMessage(err) || 'Invalid or expired token');
        setLoading(false);
      });
  }, [location.search, navigate, toast]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {loading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Verifying your mail...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md text-center" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : <div className="flex flex-col items-center">
            <p>Email verified successfully. Please login.</p>
          </div>}
    </div>
  );
};

export default VerifyEmail;
