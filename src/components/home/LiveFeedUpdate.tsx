import api from '@/integrations/api/client';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LiveFeedUpdate = () => {
  const [events, setEvents] = useState<
    {
      type: string;
      username: string;
      stream: string;
      round: string;
      option: string;
      amount: number;
      ranking: number;
      createdAt: string;
    }[]
  >([]);

  const { data } = useQuery({
    queryKey: ['latest-live-feed'],
    queryFn: async () => {
      const { data, error }: any = await api.bets.getLatestLiveFeed();
      if (error) throw error;
      return data;
    },
  });

  const setupSocketEventListeners = (socketInstance: any) => {
    if (!socketInstance) return;
    ~socketInstance.on('live-feed-update', (update: any) => {
      setEvents(currentEvents => [update, ...currentEvents]);
    });
  };

  useEffect(() => {
    if (data) {
      setEvents(data);
    }
  }, [data]);

  useEffect(() => {
    const newSocket = api.socket.connect(false);

    const handleConnect = () => {
      api.socket.joinLiveFeed(newSocket);
    };

    const handleReconnect = () => {
      api.socket.joinLiveFeed(newSocket);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('reconnect', handleReconnect);

    if (newSocket.connected) {
      api.socket.joinLiveFeed(newSocket);
    }

    setupSocketEventListeners(newSocket);

    // Cleanup function to prevent duplicate listeners
    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('reconnect', handleReconnect);
      newSocket.off('live-feed-update');
      newSocket.disconnect();
    };
  }, []);

  const renderItems = event => {
    let render = <></>;

    switch (event.type) {
      case 'BET_ROUND_LOCKED':
        render = (
          <>
            <p>
              [🔒] Picking for <span className="text-creator-green">{event.round}</span> is now
              locked!
            </p>
          </>
        );
        break;
      case 'BET_ROUND_CLOSED':
        render = (
          <>
            <p>
              [⛔] Picking for <span className="text-creator-green">{event.round}</span> has
              concluded!
            </p>
          </>
        );
        break;
      case 'BET_ROUND_OPEN':
        render = (
          <>
            <p>
              [🟢] Picking for <span className="text-creator-green">{event.round}</span> is now
              open!
            </p>
          </>
        );
        break;
      case 'RANK_UP':
        render = (
          <>
            <p>
              [👑] <span className="text-creator-green">{event.username}</span> has gone up the
              ranks is now <span className="text-creator-green">Rank {event.ranking}</span>!
            </p>
          </>
        );
        break;
      case 'BET_PLACED':
        render = (
          <>
            <p>
              [🎲] <span className="text-creator-green">{event.username}</span> has placed{' '}
              <span className="text-creator-green">{event.amount} CadeCoin/s</span> to{' '}
              <span className="text-creator-green">{event.option}</span> of{' '}
              <span className="text-creator-green">{event.round}</span>!
            </p>
          </>
        );
        break;
      default:
        break;
    }
    return render;
  };

  return (
    <div>
      <div className="border-[#77dd09] border-2 mt-6 p-4 rounded-tr-[50px] rounded-tl-lg  rounded-br-lg  rounded-bl-[50px] live-feed-container">
        <div className="flex justify-end">
          <div className="live-feed-header">
            <p>LIVE FEED</p>
            <div className="status-indicator flex items-center gap-1">
              <span className="rec-dot"></span>
              <span className="rec-text">REC</span>
            </div>
          </div>
        </div>
        <div className=" h-64 overflow-x-auto pl-10 pr-10 mt-2">
          <AnimatePresence>
            {events.map((event, i) => (
              <motion.div
                key={i}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100 }}
              >
                <div className="mb-2 flex justify-between border-b-4 border-dotted ease-in duration-1000 ">
                  <div className=" text-sm">{renderItems(event)}</div>
                  <p className="text-gray-500 text-xs">~ {moment(event.createdAt).fromNow()}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LiveFeedUpdate;
