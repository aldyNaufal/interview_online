import React from 'react';
import { Camera, CameraOff } from 'lucide-react';

const VideoControl = ({ isVideoEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-4 rounded-full transition-all transform hover:scale-105 ${
        isVideoEnabled 
          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
          : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
      }`}
      title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
    >
      {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
    </button>
  );
};

export default VideoControl;