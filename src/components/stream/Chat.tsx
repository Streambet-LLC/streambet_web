import { useState } from 'react';
import { ChatInput } from './ChatInput';

interface Message {
  id: number;
  text: string;
  name: string;
}

const ALL_MESSAGES: Message[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  text: `Message ${i + 1}`,
  name: 'Anyone else'
}));

interface Chat {
  sendMessageSocket:(data: { sendMessage : string }) => void;
  sendMessage:string
}

export default function Chat({sendMessageSocket,sendMessage}) {
  const [messages, setMessages] = useState<Message[]>(ALL_MESSAGES);

  const handleSend = (msg: string) => {
    const newMsg: Message = { id: Date.now(), text: msg, name: 'You' };
    setMessages(prev => [...prev, newMsg]);

  };

  return (
    <div className="flex flex-col max-h-[120vh] bg-black text-white border border-zinc-700 rounded-[16px]">
      <div className="p-4 text-sm font-semibold ">Live chat</div>

      <div
        id="scrollableDiv"
        className="flex-1 h-screen overflow-y-auto px-4 py-2 space-y-2 bg-['rgba(36, 36, 36, 1)']"
        style={{ display: 'flex', flexDirection: 'column-reverse', backgroundColor: 'rgba(24, 24, 24, 1)' }}
      >
        {messages.slice().reverse().map(msg => (
          <div
            key={msg.id}
            className="px-4 py-2 rounded-lg  mb-2 bg-[#181818]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#606060]">{msg.name}</span>
              <span className="text-[10px] text-[#FFFFFF] ml-2">
                {new Date(msg.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <span className="text-[#D7DFEF] text-xs font-medium">{msg.text}</span>
          </div>
        ))}
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  );
}