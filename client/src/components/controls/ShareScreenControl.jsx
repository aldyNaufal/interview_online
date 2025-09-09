import React from 'react';
import { Monitor, MonitorOff } from 'lucide-react';

const ScreenShareControl = ({ isScreenSharing, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-4 rounded-full transition-all transform hover:scale-105 ${
        isScreenSharing 
          ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
          : 'bg-gray-700 hover:bg-gray-600 text-white'
      }`}
      title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
    >
      {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
    </button>
  );
};

export default ScreenShareControl;