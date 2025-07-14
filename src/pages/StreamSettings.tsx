import { Navigation } from '@/components/Navigation';
import { StreamSettings as StreamSettingsComponent } from '@/components/StreamSettings';
import { useParams, useNavigate } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';

const StreamSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: stream, refetch } = useStreamData(id!);
  const { session } = useAuthContext();

  useEffect(() => {
    if (!session) {
      toast({
        title: 'Access Denied',
        description: 'Please login to access this page',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (session && session?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can access stream settings',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [session, navigate, toast]);

  if (!stream || session?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container pt-24 pb-8">
        <StreamSettingsComponent stream={stream} onUpdate={refetch} session={session} />
      </main>
    </div>
  );
};

export default StreamSettings;
