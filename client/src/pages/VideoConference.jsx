import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/ui/Header.jsx';
import VideoGrid from '../components/ui/VideoGrid.jsx';
import ControlsBar from '../components/controls/ControlsBar.jsx';
import { useRoom } from '../hooks/useRoom.js';
import { useMediaControls } from '../hooks/useMediaControls.js';
import useAuth from '../hooks/useAuth.js';

const VideoConference = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    participants,
    localVideoRef,
    remoteVideoRefs,
    leaveRoom,
    joinRoom,
    joinRoomById,
    isJoined,
    isConnecting,
    error,
    livekitService
  } = useRoom();
  
  // Add media controls
  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  } = useMediaControls(livekitService);
  
  const { userData, handleLogout, isAuthenticated } = useAuth();
  const [meetingData, setMeetingData] = useState(null);
  const [autoJoinCompleted, setAutoJoinCompleted] = useState(false);
  const [previousRoute, setPreviousRoute] = useState('/');

  // Store previous route from navigation state or session storage
  useEffect(() => {
    const storedPreviousRoute = sessionStorage.getItem('previousRoute');
    const navigationState = location.state?.from;
    
    if (navigationState) {
      setPreviousRoute(navigationState);
      sessionStorage.setItem('previousRoute', navigationState);
    } else if (storedPreviousRoute) {
      setPreviousRoute(storedPreviousRoute);
    }
  }, [location]);
  
  // Check for pending meeting on component mount
  useEffect(() => {
    const pendingMeeting = sessionStorage.getItem('pendingMeeting');
    if (pendingMeeting && !autoJoinCompleted && isAuthenticated()) {
      try {
        const meetingInfo = JSON.parse(pendingMeeting);
        setMeetingData(meetingInfo);
        
        if (meetingInfo.autoJoin) {
          console.log('Auto-joining meeting:', meetingInfo);
          
          // Auto-join the room - use different method based on whether we have roomId
          if (meetingInfo.roomId) {
            // Join by room ID (includes password verification)
            joinRoomById(meetingInfo.roomId, meetingInfo.password);
          } else {
            // Join by room name (for admin-created rooms)
            joinRoom(meetingInfo.roomName, meetingInfo.participantName);
          }
          
          setAutoJoinCompleted(true);
          // Clear pending meeting data
          sessionStorage.removeItem('pendingMeeting');
        }
      } catch (error) {
        console.error('Error parsing pending meeting data:', error);
        sessionStorage.removeItem('pendingMeeting');
      }
    }
  }, [joinRoom, joinRoomById, autoJoinCompleted, isAuthenticated]);

  // Attach local video when video is enabled
  useEffect(() => {
    if (isVideoEnabled && localVideoRef.current && livekitService) {
      // Get local video track and attach it
      const attachLocalVideo = async () => {
        try {
          const localTrack = livekitService.getLocalVideoTrack();
          if (localTrack) {
            const videoElement = localTrack.attach();
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.transform = 'scaleX(-1)'; // Mirror effect for local video
            
            // Clear and append
            const container = localVideoRef.current;
            while (container.firstChild) {
              container.removeChild(container.firstChild);
            }
            container.appendChild(videoElement);
            
            console.log('Local video attached');
          }
        } catch (error) {
          console.error('Error attaching local video:', error);
        }
      };
      
      attachLocalVideo();
    } else if (!isVideoEnabled && localVideoRef.current) {
      // Clear video when disabled
      const container = localVideoRef.current;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  }, [isVideoEnabled, localVideoRef, livekitService, isJoined]);
  
  // Handle leaving room
  const handleLeaveRoom = async () => {
    await leaveRoom();
    // Clear any remaining session data
    sessionStorage.removeItem('pendingMeeting');
    sessionStorage.removeItem('previousRoute');
    
    // Navigate back to previous route
    navigate(previousRoute, { replace: true });
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-4">Please log in to access the video conference.</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  // Show connecting state
  if (isConnecting || (meetingData && !isJoined && !error)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Joining Meeting...</h2>
          <p className="text-gray-400">
            {meetingData ? `Connecting to ${meetingData.roomName}...` : 'Please wait...'}
          </p>
          {meetingData?.roomId && (
            <p className="text-gray-500 text-sm mt-2">
              Room ID: {meetingData.roomId}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connection Failed</h2>
          <p className="text-gray-400 mb-4">
            {error || "Failed to join the meeting room."}
          </p>
          {meetingData?.roomId && (
            <p className="text-gray-500 text-sm mb-4">
              Room ID: {meetingData.roomId}
            </p>
          )}
          <div className="space-x-4">
            <button 
              onClick={() => navigate(previousRoute)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Back
            </button>
            {meetingData && (
              <button 
                onClick={() => {
                  // Retry joining with the same data
                  if (meetingData.roomId) {
                    joinRoomById(meetingData.roomId, meetingData.password);
                  } else {
                    joinRoom(meetingData.roomName, meetingData.participantName);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
                disabled={isConnecting}
              >
                {isConnecting ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const participantCount = participants.size + 1;
  const roomName = meetingData?.roomName || 'Meeting Room';
  const participantName = meetingData?.participantName || userData?.username || 'User';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header 
        roomName={roomName}
        participantName={participantName}
        participantCount={participantCount}
        onLeaveRoom={handleLeaveRoom}
        userData={userData}
        onLogout={handleLogout}
        roomId={meetingData?.roomId}
      />
      
      <VideoGrid 
        participants={participants}
        participantName={participantName}
        localVideoRef={localVideoRef}
        remoteVideoRefs={remoteVideoRefs}
        isVideoEnabled={isVideoEnabled}
      />
      
      <ControlsBar 
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeaveRoom={handleLeaveRoom}
      />
    </div>
  );
};

export default VideoConference;