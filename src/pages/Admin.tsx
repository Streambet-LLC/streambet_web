import { useStreamManagement } from '@/hooks/useStreamManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { AdminLayout } from '@/components/layout';
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

  if (!isProfileFetching && ((profile && profile.role !== 'admin') || profile === null)) {
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
