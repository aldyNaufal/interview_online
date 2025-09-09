import React, { useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { getUrlParams } from '../utils/helpers.js';

const JoinRoom = ({ onJoinRoom, isConnecting, error }) => {
  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');

  // Handle URL params and auto-join
  useEffect(() => {
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);
    console.log('Pathname:', window.location.pathname);
    
    const { room, name } = getUrlParams();
    
    console.log('Room from URL:', room);
    console.log('Name from URL:', name);
    
    if (room && room.trim()) {
      setRoomName(room);
      console.log('Set room name to:', room);
    }
    
    if (name && name.trim()) {
      setParticipantName(name);
      console.log('Set participant name to:', name);
    }
  }, []);

  const handleJoinRoom = () => {
    onJoinRoom(roomName, participantName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-400 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Meeting</h1>
          <p className="text-blue-200">Connect with others instantly</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-blue-200 text-sm font-medium mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              disabled={isConnecting}
            />
            {roomName && (
              <p className="text-blue-300 text-xs mt-1">
                Room link: {window.location.origin}/room?room={encodeURIComponent(roomName)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-blue-200 text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              disabled={isConnecting}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={isConnecting || !roomName.trim() || !participantName.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Join Meeting
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="text-blue-200 text-sm text-center">
            Powered by LiveKit • Secure & Private
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;