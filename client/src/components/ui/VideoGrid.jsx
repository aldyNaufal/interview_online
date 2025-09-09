import React, { useRef } from 'react';
import { Track } from 'livekit-client';
import ParticipantVideo from './ParticipantVideo.jsx';

const VideoGrid = ({ 
  participants, 
  participantName, 
  localVideoRef, 
  remoteVideoRefs,
  isVideoEnabled = true // Add this prop
}) => {
  
  // Create video ref callback for remote participants
  const createVideoRefCallback = (participant) => (el) => {
    if (el && participant) {
      // Store the ref
      remoteVideoRefs.current.set(participant.identity, el);
      
      // Try to attach video immediately if available
      const videoPublication = participant.getTrackPublication(Track.Source.Camera);
      if (videoPublication && videoPublication.isSubscribed && videoPublication.track) {
        const videoElement = videoPublication.track.attach();
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        
        // Clear and append
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
        el.appendChild(videoElement);
        
        console.log('Video immediately attached for:', participant.identity);
      }
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
        {/* Local participant (always first) */}
        <ParticipantVideo
          isLocal={true}
          participantName={participantName}
          videoRef={localVideoRef}
          isVideoEnabled={isVideoEnabled}
        />
        
        {/* Remote participants */}
        {Array.from(participants.values()).map((participant) => (
          <ParticipantVideo
            key={participant.identity}
            participant={participant}
            videoRef={createVideoRefCallback(participant)}
            isLocal={false}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;