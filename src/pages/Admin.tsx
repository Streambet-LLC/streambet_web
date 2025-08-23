import { useStreamManagement } from '@/hooks/useStreamManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { AdminLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

const Admin = () => {
  const {
    profile,
    isProfileFetching,
    streams,
    searchStreamQuery,
    handleRefetchStreams,
    setSearchStreamQuery
  } = useStreamManagement();
  const queryClient = useQueryClient();
  const [resetKey, setResetKey] = useState(0);
  const [isStreamContent, setIsStreamContent] = useState(false);

  const handleDashboardClick = useCallback(() => {
    queryClient.clear();
    setResetKey((prev) => prev + 1);
  }, [queryClient]);

  if (isProfileFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
    

  return (
    <AdminLayout onDashboardClick={handleDashboardClick} isStreamContent={isStreamContent}>
      <AdminManagement
        key={resetKey}
        session={profile}
        streams={streams}
        refetchStreams={(range) => handleRefetchStreams(range)}
        searchStreamQuery={searchStreamQuery}
        setSearchStreamQuery={setSearchStreamQuery}
        onStreamContentChange={setIsStreamContent}
      />
    </AdminLayout>
  );
};

export default Admin;
