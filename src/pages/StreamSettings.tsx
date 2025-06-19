import { Navigation } from '@/components/Navigation';
import { StreamSettings as StreamSettingsComponent } from '@/components/StreamSettings';
import { useParams, useNavigate } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

const StreamSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: stream, refetch } = useStreamData(id!);

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

    if (profile && profile?.data?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can access stream settings',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [session, profile, navigate, toast]);

  if (!stream || profile?.data?.role !== 'admin') return null;

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
