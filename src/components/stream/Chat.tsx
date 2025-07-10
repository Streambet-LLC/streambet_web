import { useState } from 'react';
import { ChatInput } from './ChatInput';

interface Message {
  id: number;
  text: string;
  name: string;
}

const ALL_MESSAGES: Message[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  text: `Message ${i + 1}`,
  name: 'Anyone else'
}));

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(ALL_MESSAGES);

  const handleSend = (msg: string) => {
    const newMsg: Message = { id: Date.now(), text: msg, name: 'You' };
    setMessages(prev => [...prev, newMsg]);
    // setTimeout(() => {
    //   const container = document.getElementById('scrollableDiv');
    //   if (container) container.scrollTop = container.scrollHeight;
    // }, 50);
  };

  return (
    <div className="flex flex-col h-[150vh] bg-black text-white border border-zinc-700 rounded-[16px]">
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
              <span className="text-sm font-semibold text-lime-400">{msg.name}</span>
              <span className="text-xs text-zinc-400 ml-2">
                {new Date(msg.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <span className="text-white text-sm">{msg.text}</span>
          </div>
        ))}
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  );
}