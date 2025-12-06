'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../lib/socket';

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 20; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerate = () => {
    setRoomCode(generateRoomCode());
  };

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateRoom = () => {
    if (!roomCode) {
      alert('Please generate a room code first');
      return;
    }

    const roomId = roomCode;
    const userId = socket.id || crypto.randomUUID();

    socket.emit('userJoined', { userId, roomId });

    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    const roomId = joinCode.trim();
    const userId = socket.id || crypto.randomUUID();

    socket.emit('userJoined', { userId, roomId });
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Create Room */}
          <div className="bg-white rounded-lg border-2 border-blue-300 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <h1 className="text-2xl md:text-4xl font-bold text-blue-600 text-center mb-6 md:mb-8">
              Create Room
            </h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input
                    type="text"
                    value={roomCode}
                    placeholder="Generate room code"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm md:text-base"
                    readOnly
                  />
                  <button
                    onClick={handleGenerate}
                    className="px-4 py-2 bg-blue-600 text-white text-sm md:text-base font-semibold rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Generate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-white text-red-600 text-sm md:text-base font-semibold rounded-md border-2 border-red-600 hover:bg-red-50 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-4"
              >
                Create Room
              </button>
            </div>
          </div>

          {/* Join Room */}
          <div className="bg-white rounded-lg border-2 border-blue-300 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
            <h1 className="text-2xl md:text-4xl font-bold text-blue-600 text-center mb-6 md:mb-8">
              Join Room
            </h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                />
              </div>
              <button
                onClick={handleJoinRoom}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-4"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
