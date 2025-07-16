// hooks/useMeeting.js
import { useState, useEffect, useCallback, useRef } from 'react';
import webSocketService from '../services/websocketService';
import apiService from '../services/apiService';

export const useMeeting = (userId, roomId) => {
  // Connection state
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  
  // Room state
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [breakoutRooms, setBreakoutRooms] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  
  // Media state
  const [mediaState, setMediaState] = useState({
    audio_enabled: true,
    video_enabled: true,
    screen_sharing: false
  });
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Error state
  const [error, setError] = useState(null);
  
  // References
  const recordingTimerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize WebSocket connection
  const initializeConnection = useCallback(async () => {
    try {
      setError(null);
      await webSocketService.connect(userId);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setError('Failed to connect to server');
      setIsConnected(false);
    }
  }, [userId]);

  // Join room
  const joinRoom = useCallback(async (userInfo) => {
    if (!webSocketService.isConnected()) {
      await initializeConnection();
    }
    
    const success = webSocketService.joinRoom(roomId, userInfo);
    if (success) {
      // Update media state
      webSocketService.updateMediaState(mediaState);
      
      // Fetch initial room data
      try {
        const [roomDetails, participants, messages] = await Promise.all([
          apiService.getRoomDetails(roomId),
          apiService.getRoomParticipants(roomId),
          apiService.getChatMessages(roomId)
        ]);
        
        setRoomInfo(roomDetails);
        setParticipants(participants);
        setChatMessages(messages);
      } catch (error) {
        console.error('Failed to fetch room data:', error);
      }
    }
    
    return success;
  }, [roomId, mediaState, initializeConnection]);

  // Leave room
  const leaveRoom = useCallback(() => {
    webSocketService.leaveRoom(roomId);
    setParticipants([]);
    setChatMessages([]);
    setRoomInfo(null);
  }, [roomId]);

  // Send chat message
  const sendChatMessage = useCallback((message) => {
    return webSocketService.sendChatMessage(roomId, message);
  }, [roomId]);

  // Update media state
  const updateMediaState = useCallback((newState) => {
    setMediaState(prev => {
      const updated = { ...prev, ...newState };
      webSocketService.updateMediaState(updated);
      return updated;
    });
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    updateMediaState({ audio_enabled: !mediaState.audio_enabled });
  }, [mediaState.audio_enabled, updateMediaState]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    updateMediaState({ video_enabled: !mediaState.video_enabled });
  }, [mediaState.video_enabled, updateMediaState]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(() => {
    updateMediaState({ screen_sharing: !mediaState.screen_sharing });
  }, [mediaState.screen_sharing, updateMediaState]);

  // Start recording
  const startRecording = useCallback(() => {
    const success = webSocketService.startRecording(roomId);
    if (success) {
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return success;
  }, [roomId]);

  // Stop recording
  const stopRecording = useCallback(() => {
    const success = webSocketService.stopRecording(roomId);
    if (success) {
      setIsRecording(false);
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return success;
  }, [roomId]);

  // Create breakout room
  const createBreakoutRoom = useCallback((roomName) => {
    return webSocketService.createBreakoutRoom(roomId, roomName);
  }, [roomId]);

  // Join breakout room
  const joinBreakoutRoom = useCallback((breakoutRoomId) => {
    return webSocketService.joinBreakoutRoom(breakoutRoomId);
  }, []);

  // WebSocket message handlers
  useEffect(() => {
    const handleUserJoined = (message) => {
      setParticipants(prev => {
        const exists = prev.some(p => p.id === message.user_id);
        if (!exists) {
          return [...prev, {
            id: message.user_id,
            ...message.user_info
          }];
        }
        return prev;
      });
    };

    const handleUserLeft = (message) => {
      setParticipants(prev => prev.filter(p => p.id !== message.user_id));
    };

    const handleChatMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleMediaStateUpdate = (message) => {
      setParticipants(prev => prev.map(p => 
        p.id === message.user_id 
          ? { ...p, media_state: message.media_state }
          : p
      ));
    };

    const handleBreakoutRoomCreated = (message) => {
      setBreakoutRooms(prev => [...prev, message.breakout_room]);
    };

    const handleRecordingStarted = (message) => {
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    };

    const handleRecordingStopped = (message) => {
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };

    const handleError = (message) => {
      setError(message.message);
    };

    // Register handlers
    webSocketService.on('user_joined', handleUserJoined);
    webSocketService.on('user_left', handleUserLeft);
    webSocketService.on('chat_message', handleChatMessage);
    webSocketService.on('media_state_update', handleMediaStateUpdate);
    webSocketService.on('breakout_room_created', handleBreakoutRoomCreated);
    webSocketService.on('recording_started', handleRecordingStarted);
    webSocketService.on('recording_stopped', handleRecordingStopped);
    webSocketService.on('error', handleError);

    // Connection state handler
    const handleConnectionStateChange = (state) => {
      setConnectionState(state);
      setIsConnected(state === 'connected');
    };

    webSocketService.onStateChange(handleConnectionStateChange);

    return () => {
      // Cleanup handlers
      webSocketService.off('user_joined');
      webSocketService.off('user_left');
      webSocketService.off('chat_message');
      webSocketService.off('media_state_update');
      webSocketService.off('breakout_room_created');
      webSocketService.off('recording_started');
      webSocketService.off('recording_stopped');
      webSocketService.off('error');
      webSocketService.offStateChange(handleConnectionStateChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection state
    connectionState,
    isConnected,
    error,
    
    // Room state
    participants,
    chatMessages,
    breakoutRooms,
    roomInfo,
    
    // Media state
    mediaState,
    
    // Recording state
    isRecording,
    recordingTime,
    
    // Actions
    initializeConnection,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    updateMediaState,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    createBreakoutRoom,
    joinBreakoutRoom
  };
};