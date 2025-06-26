// pages/StreamPage.tsx
import React from 'react';
import { VideoPlayer } from '../VideoPlayer';
import LiveChat from '../ui/LiveChat';


const OverView = () => {
    const totalUsers = 1280;
    const activeBets = 91.42;
    const totalLiveTime = 42321;
    
  return (
    <div className="min-h-screen text-white">
      {/* Top Stats */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
               <div className="bg-zinc-900  p-5 rounded-lg shadow h-[109px]  center">
                 <p className="text-sm font-medium text-[rgba(255, 255, 255, 0.75)] pb-2" >
                   Users
                 </p>
                 <p className="text-2xl font-semibold text-[rgba(255, 255, 255, 1)]">${totalUsers}</p>
               </div>

               <div className="bg-zinc-900 text-white p-5 rounded-lg h-[109px]  shadow relative">
                 <p className="text-sm font-medium text-[rgba(255, 255, 255, 0.75)] pb-2">
                  Active Streams
                </p>
                 <p className="text-2xl font-semibold">14</p>
               </div>

               <div className="bg-zinc-900 text-white p-5 rounded-lg h-[109px]  shadow">
                 <p className="text-sm font-medium text-[rgba(255, 255, 255, 0.75)] pb-2">
                   Active Bets
                 </p>
                 <p className="text-2xl font-semibold">${activeBets.toFixed(2)}</p>
               </div>

              <div className="bg-zinc-900 text-white p-5 rounded-lg h-[109px]  shadow">
                 <p className="text-sm font-medium text-[rgba(255, 255, 255, 0.75)] pb-2">
                   Time Live
                 </p>
                <p className="text-2xl font-semibold">{totalLiveTime.toLocaleString()} hours</p>
               </div>
             </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left - Video & Actions */}
        <div className="col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">My Epic Stream - Playing Valorant all day</h2>
            <VideoPlayer playbackId={''} />
          </div>

          {/* Activity Feed + Mod Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black p-4 rounded-md">
              <h3 className="font-bold mb-2">Activity Feed</h3>
              <p>Anyone else bet:<br /><strong>50 Stream Coins</strong></p>
              {/* Repeat above for more entries */}
            </div>
            <div className="bg-black p-4 rounded-md space-y-2">
              <h3 className="font-bold">Mod Actions</h3>
              <button className="bg-gray-700 w-full py-2 rounded-md">Edit Options</button>
              <button className="bg-gray-700 w-full py-2 rounded-md">Lock Bet</button>
              <button className="bg-gray-700 w-full py-2 rounded-md">Select Winner</button>
              <button className="bg-red-600 w-full py-2 rounded-md">End Stream</button>
            </div>
          </div>
        </div>

        {/* Right - Live Chat */}
        <div>
          <LiveChat />
        </div>
      </div>
    </div>
  );
};

export default OverView;
