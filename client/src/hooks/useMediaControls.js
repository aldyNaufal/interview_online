import { useState } from 'react';

export const useMediaControls = (livekitService) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Toggle audio
  const toggleAudio = async () => {
    if (livekitService) {
      const newState = !isAudioEnabled;
      await livekitService.toggleMicrophone(newState);
      setIsAudioEnabled(newState);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (livekitService) {
      const newState = !isVideoEnabled;
      await livekitService.toggleCamera(newState);
      setIsVideoEnabled(newState);
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (livekitService) {
      const newState = !isScreenSharing;
      await livekitService.toggleScreenShare(newState);
      setIsScreenSharing(newState);
    }
  };

  return {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  };
};