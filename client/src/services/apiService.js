import { API_BASE_URL, ROOM_CONFIG } from '../utils/constants.js';

// Get token for joining room
export const getToken = async (roomName, participantName) => {
  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomName: roomName.trim(),
      participantName: participantName.trim(),
      maxParticipants: ROOM_CONFIG.maxParticipants
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};