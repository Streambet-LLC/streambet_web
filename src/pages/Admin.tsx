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
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        {/* Analytics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px] mb-12">
          {/* Users Card */}
          <div className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center" style={{ minHeight: 109, height: 109, padding: 24 }}>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
          {/* Active Streams Card */}
          <div className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center" style={{ minHeight: 109, height: 109, padding: 24 }}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
          {/* Active Bets Card */}
          <div className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center" style={{ minHeight: 109, height: 109, padding: 24 }}>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
          {/* Time Live Card */}
          <div className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center" style={{ minHeight: 109, height: 109, padding: 24 }}>
            <Skeleton className="h-4 w-18 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>

        {/* Tab Navigation and Search */}
        <div className="flex items-center justify-between w-full mb-4">
          <div className="flex space-x-2 ml-4">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-64 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-full" />
          </div>
        </div>

        <div className="h-px bg-[#2D343E] mb-6" />

        {/* Table Content */}
        <div className="space-y-4">
          <div className="bg-[rgba(22,22,22,1)] rounded-xl p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
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
