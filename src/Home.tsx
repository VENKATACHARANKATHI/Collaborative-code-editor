import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Users } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const generateRoomId = () => {
    setRoomId(uuidv4());
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      console.log(`Joining room ${roomId} as ${username}`);
      
      // Navigate to the editor with username and roomId
      navigate(`/editor/${roomId}`, { 
        state: { 
          username
        } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1729] text-white relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black-500/20 to-gray-500/20" />
        <div className="absolute -top-[40rem] -left-[40rem] w-[80rem] h-[80rem] bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-[40rem] -right-[40rem] w-[80rem] h-[80rem] bg-gray-500/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-gray-800 p-6 border border-gray-80 shadow-1g">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              <img src="https://i.pinimg.com/736x/46/97/d5/4697d53c83152a902cb3917d12b77315.jpg" alt="Team F12" className="w-10 h-10 inline-block mr-2" />
              Team F12
              </h1>
              <p className="text-gray-400 mb-8">
                Real-time Collaborative Code Editor
              </p>
            </div>

            <form onSubmit={joinRoom} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                  required
                />
              </div>

              <label className="block text-sm font-medium text-gray-300">
                Room ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                  required
                />
                <button
                  type="button"
                  onClick={generateRoomId}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors backdrop-blur-sm"
                >
                  Generate
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Join Room
                </div>
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Create a new room or join an existing one to start coding together in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;