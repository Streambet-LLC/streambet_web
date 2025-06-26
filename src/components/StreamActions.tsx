import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StreamActionsProps {
  streamId: string;
  onDelete?: (id: string) => void;
}

export const StreamActions = ({ streamId, onDelete }: StreamActionsProps) => {
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

  return (
    <div className="flex items-center gap-2">
      {onDelete && (
        <Button variant="destructive" onClick={() => onDelete(streamId)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
      {profile?.data?.role === 'admin' && (
        <Link to={`/stream/${streamId}/settings`} className="flex-1">
          <Button variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      )}
      <Link to={`/stream/${streamId}`} className="flex-1">
        <Button className="w-full rounded-full border border-[#7F56D9] font-medium text-[12px]">View Stream</Button>
      </Link>
    </div>
  );
};
