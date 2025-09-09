import React, { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';
import { Camera, CameraOff, MicOff, Mic } from 'lucide-react';

const ParticipantVideo = ({ 
  participant, 
  participantName, 
  isLocal = false, 
  videoRef,
  isVideoEnabled = true // Add this prop for local video state
}) => {
  const identity = isLocal ? 'local' : participant?.identity;
  const name = isLocal ? participantName : (participant?.name || participant?.identity);
  
  // Check audio status for remote participants
  const hasAudio = !isLocal && participant ? 
    participant.getTrackPublication(Track.Source.Microphone)?.isSubscribed : true;
  
  // Check video status - use prop for local, check publication for remote
  const hasVideo = isLocal ? isVideoEnabled : (
    participant ? 
    participant.getTrackPublication(Track.Source.Camera)?.isSubscribed : true
  );

  // Effect to handle video attachment for remote participants
  useEffect(() => {
    if (!isLocal && participant && videoRef?.current) {
      const videoPublication = participant.getTrackPublication(Track.Source.Camera);
      
      if (videoPublication && videoPublication.isSubscribed && videoPublication.track) {
        const videoElement = videoPublication.track.attach();
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        
        // Clear existing content and append video
        const container = videoRef.current;
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(videoElement);
        
        console.log('Video attached for participant:', participant.identity);
      }
    }
  }, [participant, videoRef, isLocal]);
  
  return (
    <div key={identity} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group">
      <div
        ref={videoRef}
        className="w-full h-full bg-gray-700 flex items-center justify-center"
      >
        {/* Show avatar when video is disabled or not available */}
        {(!hasVideo || (isLocal && !isVideoEnabled)) && (
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-xl">
              {name?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      {/* Participant name */}
      <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg backdrop-blur-sm">
        <span className="text-white text-sm font-medium">
          {isLocal ? 'You' : name}
        </span>
      </div>
      
      {/* Status indicators */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* Video status */}
        <div className={`p-1 rounded ${hasVideo ? 'bg-green-500' : 'bg-gray-500'}`}>
          {hasVideo ? (
            <Camera className="w-3 h-3 text-white" />
          ) : (
            <CameraOff className="w-3 h-3 text-white" />
          )}
        </div>
        
        {/* Audio status for remote participants */}
        {!isLocal && (
          <div className={`p-1 rounded ${hasAudio ? 'bg-green-500' : 'bg-red-500'}`}>
            {hasAudio ? (
              <Mic className="w-3 h-3 text-white" />
            ) : (
              <MicOff className="w-3 h-3 text-white" />
            )}
          </div>
        )}
      </div>
      
      {/* Connection status for remote participants */}
      {!isLocal && (
        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default ParticipantVideo;