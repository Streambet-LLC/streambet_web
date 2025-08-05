import { useEffect, useRef, useState } from 'react';
import { ChatInput } from './ChatInput';
import { getImageLink } from '@/utils/helper';
import api from '@/integrations/api/client';
import InfiniteScroll from 'react-infinite-scroll-component';

interface Message {
  id: number;
  text: string;
  name: string;
  profileImageUrl?: string;
  profileUrl?: string;
  imageURL?: string;
  timestamp: string;
}

interface IncomingMessage {
  profileUrl: any;
  profileImageUrl: any;
  type: string;
  username: string;
  message: string;
  imageURL: string;
  timestamp: string;
}

interface ChatProps {
  sendMessageSocket: (data: { message: string; imageURL: string }) => void;
  sendMessage?: string;
  newSocketMessage?: IncomingMessage; 
  session:any;
  streamId?: string;
  isDisabled?: boolean;
}


const LIMIT = 20;

export default function Chat({ sendMessageSocket, newSocketMessage,session,streamId, isDisabled = false }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [rangeStart, setRangeStart] = useState(0);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);  // To show the latest sending message at the bottom
  const scrollRef = useRef<HTMLDivElement | null>(null);

   const formatIncoming = (data: any): Message => ({
    id: data?.id,
    text: data?.message,
    name: data?.user?.username === session?.username ? 'Me' : data.user?.username || '',
    imageURL: data?.imageURL,
    timestamp: data?.createdAt,
    profileImageUrl: data?.user?.profileImageUrl || data?.user?.profileUrl,
  });


   const fetchMessages = async () => {
    if (!session?.id || !streamId) return;


    try {
      const res = await api.socket.getChatMessages(streamId, `[${rangeStart + newMessageCount},${LIMIT}]`);
      const newMessages = res?.data?.map(formatIncoming) || [];
      if (newMessages.length < LIMIT) {
        setHasMore(false);
      }
      setMessages(prev => [...newMessages.reverse(), ...prev]);
      setRangeStart(prev => prev + LIMIT);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setHasMore(false);
    }
  };


  useEffect(() => {
    fetchMessages();
  }, [session?.id, streamId]);

  const handleSend = (message: string, imageURL: string) => {
    sendMessageSocket({ message, imageURL });
    setTimeout(() => scrollToBottom(), 50); // Ensure scroll after DOM updates
  };

  useEffect(() => {
    if (newSocketMessage) {
      const newMsg = {
        id: Date.now(),
        text: newSocketMessage.message,
        name: newSocketMessage.username === session?.username ? 'Me' : newSocketMessage.username,
        imageURL: newSocketMessage.imageURL,
        timestamp: newSocketMessage.timestamp,
        profileImageUrl:newSocketMessage?.profileImageUrl || newSocketMessage?.profileUrl,
      };
      setMessages(prev => [...prev, newMsg]);
      setNewMessageCount(prev => prev + 1);   // Increment new message count
      
      // Always scroll to bottom when a new message is sent
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [newSocketMessage]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    // Allow a buffer of 10px
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 10);
  };

  const container = scrollRef.current;
  if (container) container.addEventListener('scroll', handleScroll);

  return () => {
    if (container) container.removeEventListener('scroll', handleScroll);
  };
}, []);


  return (
    <div className="flex flex-col h-[730px] bg-black text-white border border-zinc-700 rounded-[16px]">
      <div className="p-4 text-sm font-semibold">Live chat</div>

      <div
        ref={scrollRef}
        id="scrollableDiv"
        className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-[#181818] chat-scroll-hide"
        style={{ display: 'flex', flexDirection: 'column-reverse' }}
      >
        <InfiniteScroll
          dataLength={messages.length}
          next={fetchMessages}
          hasMore={hasMore}
          inverse={true}
          scrollableTarget="scrollableDiv"
          loader={false}
        >
          {messages.map(msg => (
            <div key={msg.id} className="pl-1 pr-4 py-2 rounded-lg mb-2 bg-[#181818]">
              <div className="flex items-center justify-between mb-1">
               <div className="flex items-center">
                 
                    {/* {msg?.profileImageUrl ? ( */}
                    <img
                      src={getImageLink(msg.profileImageUrl)}
                      alt={msg.name}
                      className="w-6 h-6 rounded-full mr-2 object-cover"
                    />
                  {/* ) : (
                    <div className="w-6 h-6 rounded-full bg-[#BDFF00] text-black flex items-center justify-center mr-2 text-xs font-medium">
                      {msg.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )} */}
                  
                  <span
                    className="text-sm font-semibold"
                    style={{ color: msg.name === 'Me' ? '#BDFF00' : '#606060' }}
                  >
                    {msg.name}
                  </span>
                </div>
                <span className="text-xs text-[#FFFFFF] ml-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>

              <div className="text-[#D7DFEF] text-[13px] font-medium break-words w-[190px] leading-normal ml-[32px]">
                {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  /^https?:\/\/[^\s]+$/.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">
                      {part}
                    </a>
                  ) : (
                    part
                  )
                )}
              </div>

              {msg.imageURL && (
                <img
                  onLoad={scrollToBottom}
                  src={getImageLink(msg.imageURL)}
                  alt="chat media"
                  className="mt-1 rounded max-w-[200px]"
                />
              )}
            </div>
          ))}
        </InfiniteScroll>
      </div>


      {session != null && (<ChatInput onSend={handleSend} onImageAdd={scrollToBottom} isDisabled={isDisabled} />)}
    </div>
  );
}
