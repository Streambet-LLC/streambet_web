import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { UserTable } from './UserTable';

export const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Replace with real data
  const totalUsers = 1280;
  const activeBets = 91.42;
  const totalLiveTime = 42321;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'livestreams', label: 'Livestreams' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.key;
            const isFirst = idx === 0;
            const isLast = idx === tabs.length - 1;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
              px-6 py-2 text-sm font-medium
              border border-[#2D343E]
              ${isLast ? 'border-r-1' : ''}
              ${isFirst ? 'rounded-l-lg' : ''}
              ${isLast ? 'rounded-r-lg' : ''}
              ${isActive ? 'bg-[#2A2A2A] text-white' : ' text-white hover:bg-[#1f1f1f]'}
            `}
                style={{
                  borderColor: '#2D343E',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'users' && (
          <div className="relative rounded-md" style={{ border: '1px solid #2D343E' }}>
            <Input
              id="search-users"
              type="text"
              placeholder="Search"
              value={searchUserQuery}
              onChange={e => setSearchUserQuery(e.target.value)}
              className="pl-9 rounded-md"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
              Users
            </p>
            <p className="text-2xl font-semibold">${totalUsers}</p>
          </div>

          <div className="bg-zinc-900 text-white p-4 rounded-lg shadow relative">
            <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
              Active Streams
            </p>
            <p className="text-2xl font-semibold">14</p>
          </div>

          <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
              Active Bets
            </p>
            <p className="text-2xl font-semibold">${activeBets.toFixed(2)}</p>
          </div>

          <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
              Time Live
            </p>
            <p className="text-2xl font-semibold">{totalLiveTime.toLocaleString()} hours</p>
          </div>
        </div>
      )}

      {activeTab === 'livestreams' && (
        <div className="text-white p-4 bg-zinc-800 rounded-md">
          <p className="text-lg font-medium">Livestreams content goes here.</p>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <UserTable searchUserQuery={searchUserQuery} />
        </div>
      )}
    </div>
  );
};
