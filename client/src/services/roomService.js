// services/roomService.js
class RoomService {
  constructor() {
    this.baseURL = 'http://localhost:8000/api';
  }

  // Get authorization headers
  getAuthHeaders() {
    const token = sessionStorage.getItem('access_token');
    const tokenType = sessionStorage.getItem('token_type') || 'Bearer';
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    return {
      'Authorization': `${tokenType} ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Handle API errors consistently
  async handleResponse(response) {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || 'Unknown error';
      } catch (e) {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      
      throw new Error(`${errorMessage} (${response.status})`);
    }
    
    return await response.json();
  }

  // Generate LiveKit token
  async generateToken(roomName, participantName, roomId = null, password = null) {
    const response = await fetch(`${this.baseURL}/token`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        roomName,
        participantName,
        roomId,
        roomPassword: password,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }),
    });

    return await this.handleResponse(response);
  }

  // Create a new room (admin only)
  async createRoom(roomData) {
    const response = await fetch(`${this.baseURL}/admin/room`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        roomName: roomData.roomName,
        password: roomData.password || null,
        maxParticipants: roomData.maxParticipants || 10,
        isPrivate: roomData.isPrivate || false,
        metadata: roomData.description || null
      }),
    });

    return await this.handleResponse(response);
  }

  // Join room by ID
  async joinRoomById(roomId, password = null) {
    const response = await fetch(`${this.baseURL}/join-room`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        room_id: roomId,
        password: password
      }),
    });

    return await this.handleResponse(response);
  }

  // Get list of rooms
  async getRoomsList() {
    const response = await fetch(`${this.baseURL}/rooms`, {
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse(response);
    return data.rooms || [];
  }

  // Get room information
  async getRoomInfo(roomIdentifier) {
    const response = await fetch(`${this.baseURL}/room/${roomIdentifier}`, {
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  // Get room participants
  async getRoomParticipants(roomName) {
    const response = await fetch(`${this.baseURL}/room/${roomName}/participants`, {
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  // Delete room (admin only)
  async deleteRoom(roomIdentifier) {
    const response = await fetch(`${this.baseURL}/admin/room/${roomIdentifier}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  // Mute participant (admin only)
  async muteParticipant(roomName, participantIdentity) {
    const response = await fetch(`${this.baseURL}/admin/room/${roomName}/mute/${participantIdentity}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  // Kick participant (admin only)
  async kickParticipant(roomName, participantIdentity) {
    const response = await fetch(`${this.baseURL}/admin/room/${roomName}/kick/${participantIdentity}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }
}

// Export singleton instance
export const roomService = new RoomService();
export default roomService;