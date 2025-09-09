import React, { useState, useEffect } from 'react';
import { useRoom } from '../hooks/useRoom.js';
import { useMediaControls } from '../hooks/useMediaControls.js';
import JoinRoom from './CreateRoom.jsx';
import VideoConference from './VideoConference.jsx';
import { getUrlParams } from '../utils/helpers.js';

const MeetingRoom = () => {
  const [participantName, setParticipantName] = useState('');
  const [roomName, setRoomName] = useState('');

  // Custom hooks
  const {
    isJoined,
    isConnecting,
    participants,
    error,
    localVideoRef,
    remoteVideoRefs,
    joinRoom,
    leaveRoom,
    livekitService
  } = useRoom();

  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  } = useMediaControls(livekitService);

  // Handle URL params on app load
  useEffect(() => {
    const { room, name } = getUrlParams();
    if (room) setRoomName(room);
    if (name) setParticipantName(name);
  }, []);

  // Handle join room
  const handleJoinRoom = async (room, name) => {
    setRoomName(room);
    setParticipantName(name);
    await joinRoom(room, name);
  };

  // Handle leave room - Navigate back to home or previous page
  const handleLeaveRoom = async () => {
    await leaveRoom();
    // Optional: Navigate back to home page
    window.location.href = '/';
  };

  // Show join form if not connected
  if (!isJoined) {
    return (
      <JoinRoom 
        onJoinRoom={handleJoinRoom}
        isConnecting={isConnecting}
        error={error}
      />
    );
  }

  // Show video conference interface when connected
  return (
    <VideoConference
      roomName={roomName}
      participantName={participantName}
      participants={participants}
      localVideoRef={localVideoRef}
      remoteVideoRefs={remoteVideoRefs}
      isAudioEnabled={isAudioEnabled}
      isVideoEnabled={isVideoEnabled}
      isScreenSharing={isScreenSharing}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
      onLeaveRoom={handleLeaveRoom}
    />
  );
};

export default MeetingRoom;