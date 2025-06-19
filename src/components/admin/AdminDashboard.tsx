import React, { useState } from 'react';
// import Layout from "@/components/Layout";
// import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, ChartBar, Settings, Shield, VideoIcon, UserCog, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// import LivestreamForm from "@/components/admin/LivestreamForm";
// import LivestreamsList from "@/components/admin/LivestreamsList";
// import UsersManagement from "@/components/admin/UsersManagement";

const AdminDashboard: React.FC = () => {
  //   const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Redirect non-admin users
  if (!isAuthenticated || !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get user count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get active bets count
      const { count: betsCount, error: betsError } = await supabase
        .from('user_bets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (betsError) throw betsError;

      // Get active streams count
      const { count: streamsCount, error: streamsError } = await supabase
        .from('livestreams')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (streamsError) throw streamsError;

      return {
        usersCount: usersCount || 0,
        activeBets: betsCount || 0,
        activeStreams: streamsCount || 0,
      };
    },
  });

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400">Welcome back</p>
        </div>
        <Button
          variant="outline"
          className="mt-4 md:mt-0 text-white border-gray-700 hover:bg-streambet-dark"
        >
          <Settings size={18} className="mr-2" /> Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="bg-streambet-dark border border-gray-800">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-streambet-green data-[state=active]:text-black"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="streams"
              className="data-[state=active]:bg-streambet-green data-[state=active]:text-black"
            >
              Livestreams
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-streambet-green data-[state=active]:text-black"
            >
              Users
            </TabsTrigger>
          </TabsList>

          {activeTab === 'streams' && !showCreateForm && (
            <Button
              className="bg-streambet-green text-white hover:bg-opacity-80 flex items-center gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus size={18} />
              New Livestream
            </Button>
          )}

          {activeTab === 'streams' && showCreateForm && (
            <Button
              variant="outline"
              className="border-gray-700 text-white hover:bg-streambet-dark"
              onClick={() => setShowCreateForm(false)}
            >
              Back to List
            </Button>
          )}
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-streambet-dark text-white border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 text-streambet-green" size={22} />
                  Users
                </CardTitle>
                <CardDescription className="text-gray-400">Total registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{isStatsLoading ? '...' : stats?.usersCount}</p>
              </CardContent>
            </Card>

            <Card className="bg-streambet-dark text-white border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <VideoIcon className="mr-2 text-streambet-green" size={22} />
                  Active Streams
                </CardTitle>
                <CardDescription className="text-gray-400">Currently live streams</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {isStatsLoading ? '...' : stats?.activeStreams}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-streambet-dark text-white border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartBar className="mr-2 text-streambet-green" size={22} />
                  Active Bets
                </CardTitle>
                <CardDescription className="text-gray-400">Currently pending bets</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{isStatsLoading ? '...' : stats?.activeBets}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-streambet-dark text-white border-gray-800">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription className="text-gray-400">
                Latest actions on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center border-b border-gray-800 pb-2"
                  >
                    <div>
                      <p className="font-medium">User{index + 1} placed a bet</p>
                      <p className="text-sm text-gray-400">
                        {index + 1} hour{index !== 0 ? 's' : ''} ago
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-streambet-green hover:bg-black"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="streams" className="space-y-6">
            {showCreateForm ? (
              <LivestreamForm onSuccess={() => {
                setShowCreateForm(false);
              }} />
            ) : (
              <LivestreamsList />
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersManagement />
          </TabsContent> */}
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
