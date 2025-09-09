import { useState } from 'react';
import useAuth from './useAuth.js';

const useMeetingFlow = () => {
  const { userData, isAuthenticated } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Enhanced API configuration with better error handling
  const getApiConfig = () => {
    const token = sessionStorage.getItem('access_token');
    const tokenType = sessionStorage.getItem('token_type') || 'Bearer';
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    return {
      headers: {
        'Authorization': `${tokenType} ${token}`,
        'Content-Type': 'application/json',
      }
    };
  };

  // Enhanced error handling function
  const handleApiError = async (response, defaultMessage = 'Operation failed') => {
    let errorMessage = defaultMessage;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || defaultMessage;
    } catch (e) {
      // If JSON parsing fails, use status-based messages
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Authentication failed. Please log in again.';
          break;
        case 403:
          errorMessage = 'Access denied. You may not have permission for this action.';
          break;
        case 404:
          errorMessage = 'Resource not found. Please verify the information.';
          break;
        case 409:
          errorMessage = 'Resource already exists or conflict detected.';
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable. Please try again.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Request failed with status ${response.status}`;
      }
    }
    
    return new Error(errorMessage);
  };

  // Enhanced create room function
  const createRoom = async (roomData) => {
    // Check authentication - FIX: Call isAuthenticated as function
    if (!isAuthenticated()) {
      const errorMsg = 'Please log in first to create a room';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate required fields
    if (!roomData?.roomName?.trim()) {
      const errorMsg = 'Room name is required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsConnecting(true);
    setError('');

    try {
      console.log('Creating room with data:', roomData);
      
      const requestPayload = {
        roomName: roomData.roomName.trim(),
        maxParticipants: roomData.maxParticipants || 10,
        isPrivate: roomData.isPrivate || false,
        metadata: roomData.description?.trim() || null
      };

      // Only include password if provided
      if (roomData.password?.trim()) {
        requestPayload.password = roomData.password.trim();
      }

      const response = await fetch('http://localhost:8000/api/admin/room', {
        method: 'POST',
        ...getApiConfig(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw await handleApiError(response, 'Failed to create room');
      }

      const roomResponse = await response.json();
      console.log('Room created successfully:', roomResponse);
      
      return {
        roomName: roomResponse.roomName,
        roomId: roomResponse.roomId,
        sid: roomResponse.sid,
        maxParticipants: roomResponse.maxParticipants,
        isPrivate: roomResponse.isPrivate,
        hasPassword: roomResponse.hasPassword
      };
      
    } catch (error) {
      console.error('Failed to create room:', error);
      const errorMessage = error.message || 'Failed to create room';
      setError(errorMessage);
      throw error; // Re-throw the original error, don't create a new one
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced verify room access function
  const verifyRoomAccess = async (roomId, password = null) => {
    // Check authentication - FIX: Call isAuthenticated as function
    if (!isAuthenticated()) {
      const errorMsg = 'Please log in first to verify room access';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!roomId?.trim()) {
      const errorMsg = 'Room ID is required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsConnecting(true);
    setError('');

    try {
      console.log('Verifying room access for:', roomId);
      
      const requestPayload = {
        room_id: roomId.trim()
      };

      // Only include password if provided
      if (password?.trim()) {
        requestPayload.password = password.trim();
      }
      
      const response = await fetch('http://localhost:8000/api/join-room', {
        method: 'POST',
        ...getApiConfig(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        // Enhanced error handling for specific cases (matching useRoom pattern)
        if (response.status === 404) {
          throw new Error('Room not found. Please check the Room ID.');
        } else if (response.status === 401) {
          let errorMessage = 'Authentication failed or incorrect room password';
          try {
            const errorData = await response.json();
            if (errorData.detail?.includes('password required')) {
              errorMessage = 'This room requires a password.';
            } else if (errorData.detail?.includes('Invalid room password')) {
              errorMessage = 'Incorrect room password.';
            }
          } catch (e) {
            // Use default message if JSON parsing fails
          }
          throw new Error(errorMessage);
        } else {
          throw await handleApiError(response, 'Failed to verify room access');
        }
      }

      const roomInfo = await response.json();
      console.log('Room access verified:', roomInfo);
      
      return {
        name: roomInfo.roomName,
        roomId: roomInfo.roomId,
        maxParticipants: roomInfo.maxParticipants,
        isPrivate: roomInfo.isPrivate,
        hasPassword: roomInfo.hasPassword
      };
      
    } catch (error) {
      console.error('Failed to verify room access:', error);
      const errorMessage = error.message || 'Failed to verify room access';
      setError(errorMessage);
      throw error; // Re-throw the original error
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced get room list function
  const getRoomList = async () => {
    if (!isAuthenticated()) {
      const errorMsg = 'Authentication required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const response = await fetch('http://localhost:8000/api/rooms', {
        method: 'GET',
        ...getApiConfig()
      });

      if (!response.ok) {
        throw await handleApiError(response, 'Failed to get room list');
      }

      const roomData = await response.json();
      return roomData.rooms || [];
    } catch (error) {
      console.error('Failed to get room list:', error);
      setError(error.message || 'Failed to get room list');
      throw error;
    }
  };

  // Enhanced get room info function
  const getRoomInfo = async (roomIdentifier) => {
    if (!isAuthenticated()) {
      const errorMsg = 'Authentication required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!roomIdentifier?.trim()) {
      const errorMsg = 'Room identifier is required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const response = await fetch(`http://localhost:8000/api/room/${encodeURIComponent(roomIdentifier.trim())}`, {
        method: 'GET',
        ...getApiConfig()
      });

      if (!response.ok) {
        throw await handleApiError(response, 'Failed to get room info');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get room info:', error);
      setError(error.message || 'Failed to get room info');
      throw error;
    }
  };

  // Enhanced delete room function
  const deleteRoom = async (roomIdentifier) => {
    if (!isAuthenticated()) {
      const errorMsg = 'Authentication required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!roomIdentifier?.trim()) {
      const errorMsg = 'Room identifier is required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/room/${encodeURIComponent(roomIdentifier.trim())}`, {
        method: 'DELETE',
        ...getApiConfig()
      });

      if (!response.ok) {
        throw await handleApiError(response, 'Failed to delete room');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete room:', error);
      setError(error.message || 'Failed to delete room');
      throw error;
    }
  };

  // Connection test function
  const testConnection = async () => {
    try {
      if (!isAuthenticated()) {
        return false;
      }

      const response = await fetch('http://localhost:8000/api/rooms', {
        method: 'GET',
        ...getApiConfig()
      });
      
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  // Legacy functions for backward compatibility
  const createAndJoinMeeting = async (meetingData) => {
    return await createRoom(meetingData);
  };

  const joinExistingMeeting = async (roomId, password = null) => {
    return await verifyRoomAccess(roomId, password);
  };

  return {
    // New API functions
    createRoom,
    verifyRoomAccess,
    getRoomList,
    getRoomInfo,
    deleteRoom,
    testConnection,
    
    // Legacy functions for backward compatibility
    createAndJoinMeeting,
    joinExistingMeeting,
    
    // State
    isConnecting,
    error,
    setError, // Allow manual error clearing
    
    // Utilities
    getApiConfig,
    handleApiError,
    
    // Auth data - FIX: Call isAuthenticated as function
    userData,
    isAuthenticated: isAuthenticated(),
  };
};

export default useMeetingFlow;