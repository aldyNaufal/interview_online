import React from 'react';
import { Mic, MicOff } from 'lucide-react';

const AudioControl = ({ isAudioEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-4 rounded-full transition-all transform hover:scale-105 ${
        isAudioEnabled 
          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
          : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
      }`}
      title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
    >
      {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
    </button>
  );
};

export default AudioControl;