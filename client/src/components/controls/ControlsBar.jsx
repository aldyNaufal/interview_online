import React from 'react';
import { PhoneOff } from 'lucide-react';
import AudioControl from './AudioControl.jsx';
import VideoControl from './VideoControl.jsx';
import ScreenShareControl from './ShareScreenControl.jsx'

const ControlsBar = ({ 
  isAudioEnabled, 
  isVideoEnabled, 
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveRoom
}) => {
  return (
    <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
      <div className="flex items-center justify-center gap-4">
        <AudioControl 
          isAudioEnabled={isAudioEnabled}
          onToggle={onToggleAudio}
        />

        <VideoControl 
          isVideoEnabled={isVideoEnabled}
          onToggle={onToggleVideo}
        />

        <ScreenShareControl 
          isScreenSharing={isScreenSharing}
          onToggle={onToggleScreenShare}
        />

        <button
          onClick={onLeaveRoom}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-105 shadow-lg shadow-red-500/25"
          title="Leave meeting"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ControlsBar;