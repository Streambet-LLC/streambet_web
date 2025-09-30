import React, { useState } from 'react';

const LiveChat = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="flex flex-col h-full bg-black text-white rounded-lg p-4">
      <div className="flex-1 overflow-y-auto space-y-2 text-sm">
        <p><span className="text-gray-400">Anyone else:</span> this thing is starting to feel rigged</p>
        {/* Repeat or map for messages */}
      </div>
      <div className="pt-2">
        <input
          type="text"
          className="w-full px-3 py-2 rounded-md text-black"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </div>
  );
};

export default LiveChat;
