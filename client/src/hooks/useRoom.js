import { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from 'livekit-client';
import { LiveKitService } from '../services/livekit.js';
import useAuth from './useAuth.js';

export const useRoom = () => {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const [error, setError] = useState('');
  const [room, setRoom] = useState(null);
  const livekitService = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  
  const { isAuthenticated, userData } = useAuth();

  // Event handlers - defined FIRST
  const handleParticipantConnected = useCallback((participant) => {
    console.log('Participant connected:', participant.identity);
    setParticipants(prev => new Map(prev.set(participant.identity, participant)));
  }, []);
  
  const handleParticipantDisconnected = useCallback((participant) => {
    console.log('Participant disconnected:', participant.identity);
    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.delete(participant.identity);
      return newMap;
    });
    remoteVideoRefs.current.delete(participant.identity);
  }, []);
  
  const handleVideoTrackSubscribed = useCallback((element, participant) => {
    console.log('Video track subscribed for:', participant.identity);
    
    // Handle local participant (mirror effect)
    if (participant.identity === userData?.username) {
      if (localVideoRef.current && element) {
        // Clear existing video elements
        while (localVideoRef.current.firstChild) {
          localVideoRef.current.removeChild(localVideoRef.current.firstChild);
        }
        
        // Style the video element
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.objectFit = 'cover';
        element.style.transform = 'scaleX(-1)'; // Mirror local video
        
        localVideoRef.current.appendChild(element);
        console.log('Local video element attached');
      }
      return;
    }
    
    // Handle remote participants
    const videoRef = remoteVideoRefs.current.get(participant.identity);
    if (videoRef && element) {
      // Clear existing video elements
      while (videoRef.firstChild) {
        videoRef.removeChild(videoRef.firstChild);
      }
      
      // Style the video element
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.objectFit = 'cover';
      
      videoRef.appendChild(element);
      console.log('Remote video element attached for participant:', participant.identity);
    } else {
      console.warn('Video ref not found for participant:', participant.identity);
    }
  }, [userData?.username]);
  
  // FIX: Updated to match LiveKitService signature
  const handleLocalTrackPublished = useCallback((publication, participant) => {
    console.log('Local track published:', publication.kind, participant.identity);
    
    if (publication.kind === Track.Kind.Video && publication.track && localVideoRef.current) {
      const element = publication.track.attach();
      if (element) {
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.objectFit = 'cover';
        element.style.transform = 'scaleX(-1)'; // Mirror local video
        
        // Clear existing video
        while (localVideoRef.current.firstChild) {
          localVideoRef.current.removeChild(localVideoRef.current.firstChild);
        }
        localVideoRef.current.appendChild(element);
        console.log('Local video attached from publication');
      }
    }
  }, []);
  
  const handleConnected = useCallback((roomInstance) => {
    console.log('Connected to room:', roomInstance.name);
    setIsJoined(true);
    setRoom(roomInstance);
    setError(''); // Clear any previous errors
    
    // Initialize participants map
    const existingParticipants = new Map();
    roomInstance.remoteParticipants.forEach((participant, identity) => {
      existingParticipants.set(identity, participant);
    });
    setParticipants(existingParticipants);
  }, []);
  
  const handleDisconnected = useCallback((reason) => {
    console.log('Disconnected from room:', reason);
    setIsJoined(false);
    setRoom(null);
    setParticipants(new Map());
    
    // Clean up video elements
    if (localVideoRef.current) {
      localVideoRef.current.innerHTML = '';
    }
    remoteVideoRefs.current.clear();
  }, []);

  // Initialize LiveKit service AFTER callbacks are defined
  useEffect(() => {
    // Create service instance
    livekitService.current = new LiveKitService();
    
    // Set callbacks
    livekitService.current.setCallbacks({
      onParticipantConnected: handleParticipantConnected,
      onParticipantDisconnected: handleParticipantDisconnected,
      onVideoTrackSubscribed: handleVideoTrackSubscribed,
      onLocalTrackPublished: handleLocalTrackPublished,
      onConnected: handleConnected,
      onDisconnected: handleDisconnected,
    });
    
    return () => {
      if (livekitService.current) {
        livekitService.current.disconnect();
      }
    };
  }, [handleParticipantConnected, handleParticipantDisconnected, handleVideoTrackSubscribed, handleLocalTrackPublished, handleConnected, handleDisconnected]);

  // Enhanced token generation with better error handling
  const getToken = async (roomName, participantName, roomId = null, roomPassword = null) => {
    const token = sessionStorage.getItem('access_token');
    const tokenType = sessionStorage.getItem('token_type') || 'Bearer';
    
    if (!token) {
      throw new Error('No authentication token available. Please log in again.');
    }

    // Validate inputs
    if (!roomName?.trim()) {
      throw new Error('Room name is required');
    }
    
    if (!participantName?.trim()) {
      throw new Error('Participant name is required');
    }

    console.log('Requesting token with:', { 
      roomName: roomName.trim(), 
      participantName: participantName.trim(), 
      roomId,
      hasPassword: !!roomPassword 
    });
    
    try {
      // Build request body
      const requestBody = {
        roomName: roomName.trim(),
        participantName: participantName.trim()
      };

      // Add optional fields only if provided
      if (roomId?.trim()) {
        requestBody.roomId = roomId.trim();
      }
      if (roomPassword?.trim()) {
        requestBody.roomPassword = roomPassword.trim();
      }

      const response = await fetch('http://localhost:8000/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Token response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to get access token';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          // Fallback to status-based error messages
          switch (response.status) {
            case 400:
              errorMessage = 'Invalid room or participant information';
              break;
            case 401:
              errorMessage = 'Authentication failed or incorrect room password';
              break;
            case 403:
              errorMessage = 'Access denied to this room';
              break;
            case 404:
              errorMessage = 'Room not found. Please verify the room ID or name.';
              break;
            case 503:
              errorMessage = 'Room is temporarily unavailable';
              break;
            case 500:
              errorMessage = 'Server error. Please try again.';
              break;
            default:
              errorMessage = `Request failed with status ${response.status}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const tokenData = await response.json();
      console.log('Token received successfully:', {
        hasToken: !!tokenData.token,
        wsUrl: tokenData.wsUrl,
        roomName: tokenData.roomName,
        participantName: tokenData.participantName,
        roomInfo: tokenData.roomInfo
      });

      // Validate token response
      if (!tokenData.token || !tokenData.wsUrl) {
        throw new Error('Invalid token response from server');
      }

      return tokenData;
      
    } catch (error) {
      console.error('getToken error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection and ensure the backend is running.');
      }
      
      throw error;
    }
  };

  // Enhanced join room function
  const joinRoom = async (roomName, participantName, roomId = null, roomPassword = null) => {
    // Input validation
    if (!roomName?.trim() || !participantName?.trim()) {
      const errorMsg = 'Please enter both room name and your name';
      setError(errorMsg);
      return false;
    }
    
    if (!isAuthenticated()) {
      const errorMsg = 'Please log in first to join a room';
      setError(errorMsg);
      return false;
    }
    
    setIsConnecting(true);
    setError('');
    
    try {
      console.log('Attempting to join room:', { 
        roomName: roomName.trim(), 
        participantName: participantName.trim(), 
        roomId,
        hasPassword: !!roomPassword 
      });
      
      // Get token from backend
      const tokenData = await getToken(
        roomName.trim(), 
        participantName.trim(), 
        roomId, 
        roomPassword
      );
      
      // Create room and connect to LiveKit
      const roomInstance = livekitService.current.createRoom();
      await livekitService.current.connect(tokenData.wsUrl, tokenData.token);
      
      console.log('Successfully connected to room');
      return true;
      
    } catch (error) {
      console.error('Failed to join room:', error);
      
      // Enhanced error messages
      let errorMessage = 'Failed to join room. ';
      const originalMessage = error.message.toLowerCase();
      
      if (originalMessage.includes('authentication') || originalMessage.includes('401')) {
        errorMessage += 'Please log in again.';
      } else if (originalMessage.includes('403') || originalMessage.includes('access denied')) {
        errorMessage += 'You do not have permission to join this room.';
      } else if (originalMessage.includes('404') || originalMessage.includes('not found')) {
        errorMessage += 'Room not found. Please check the room ID or name.';
      } else if (originalMessage.includes('password')) {
        errorMessage += error.message; // Use the specific password error
      } else if (originalMessage.includes('connect to server')) {
        errorMessage += 'Cannot connect to server. Please check your internet connection.';
      } else if (originalMessage.includes('unavailable') || originalMessage.includes('503')) {
        errorMessage += 'Room is temporarily unavailable. Please try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      return false;
      
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced join room by ID function
  const joinRoomById = async (roomId, password = null) => {
    if (!roomId?.trim()) {
      setError('Room ID is required');
      return false;
    }

    if (!isAuthenticated()) {
      setError('Please log in first to join a room');
      return false;
    }

    setIsConnecting(true);
    setError('');

    try {
      const token = sessionStorage.getItem('access_token');
      const tokenType = sessionStorage.getItem('token_type') || 'Bearer';

      // First verify room access
      const requestBody = { room_id: roomId.trim() };
      if (password?.trim()) {
        requestBody.password = password.trim();
      }

      const verifyResponse = await fetch('http://localhost:8000/api/join-room', {
        method: 'POST',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!verifyResponse.ok) {
        let errorMessage = 'Failed to verify room access';
        try {
          const errorData = await verifyResponse.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // Use status-based error messages
          switch (verifyResponse.status) {
            case 404:
              errorMessage = 'Room not found. Please check the room ID.';
              break;
            case 401:
              errorMessage = 'Incorrect password or authentication failed.';
              break;
            default:
              errorMessage = `Access verification failed (${verifyResponse.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const roomInfo = await verifyResponse.json();
      const participantName = userData?.username || 'User';

      // Now join the room using the room name
      return await joinRoom(roomInfo.roomName, participantName, roomId.trim(), password);

    } catch (error) {
      console.error('Failed to join room by ID:', error);
      setError(error.message || 'Failed to join room');
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Leave room function
  const leaveRoom = async () => {
    try {
      if (livekitService.current) {
        await livekitService.current.disconnect();
      }
      
      // Clean up state
      setIsJoined(false);
      setRoom(null);
      setParticipants(new Map());
      setError('');
      
      console.log('Successfully left room');
    } catch (error) {
      console.error('Error leaving room:', error);
      // Don't throw error for leaving room, just log it
    }
  };

  return {
    // State
    isJoined,
    isConnecting,
    participants,
    error,
    room,
    
    // Refs
    localVideoRef,
    remoteVideoRefs,
    
    // Actions
    joinRoom,
    joinRoomById,
    leaveRoom,
    setError, // Allow manual error clearing
    
    // Service reference
    livekitService: livekitService.current,
    
    // Auth data
    userData,
    isAuthenticated: isAuthenticated(),
  };
};