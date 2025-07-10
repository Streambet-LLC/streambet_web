import { Navigation } from '@/components/Navigation';
import { useStreamManagement } from '@/hooks/useStreamManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Admin = () => {
  const [newStreamTitle, setNewStreamTitle] = useState('');
  const [newStreamDescription, setNewStreamDescription] = useState('');
  const {
    profile,
    streams,
    searchStreamQuery,
    deleteStream,
    handleRefetchStreams,
    setSearchStreamQuery
  } = useStreamManagement();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('current');
  const [resetKey, setResetKey] = useState(0);

  const handleDashboardClick = useCallback(() => {
    queryClient.clear();
    setResetKey((prev) => prev + 1);
  }, [queryClient]);

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onDashboardClick={handleDashboardClick} />
        <div className="container flex w-full pt-24 pb-8">
          <main className="flex-1 pl-4">{<AdminManagement
              key={resetKey}
              session={profile}
              streams={streams}
              refetchStreams={(range) => handleRefetchStreams(range)}
              searchStreamQuery={searchStreamQuery}
              setSearchStreamQuery={setSearchStreamQuery}
            />}
          </main>
        </div>
    </div>
  );
};

export default Admin;
