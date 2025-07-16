// services/apiService.js
class ApiService {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Get server status
  async getServerStatus() {
    return this.get('/');
  }

  // Get WebSocket statistics
  async getWebSocketStats() {
    return this.get('/ws/stats');
  }

  // Get active rooms
  async getActiveRooms() {
    return this.get('/api/rooms');
  }

  // Create room
  async createRoom(roomData) {
    return this.post('/api/rooms', roomData);
  }

  // Get room details
  async getRoomDetails(roomId) {
    return this.get(`/api/rooms/${roomId}`);
  }

  // Get room participants
  async getRoomParticipants(roomId) {
    return this.get(`/api/rooms/${roomId}/participants`);
  }

  // Get chat messages
  async getChatMessages(roomId, limit = 50, offset = 0) {
    return this.get(`/api/rooms/${roomId}/messages`, { limit, offset });
  }

  // Get breakout rooms
  async getBreakoutRooms(roomId) {
    return this.get(`/api/rooms/${roomId}/breakout-rooms`);
  }

  // Update user profile
  async updateUserProfile(userId, userData) {
    return this.put(`/api/users/${userId}`, userData);
  }

  // Get user profile
  async getUserProfile(userId) {
    return this.get(`/api/users/${userId}`);
  }

  // Upload file
  async uploadFile(file, roomId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('room_id', roomId);

    return this.request('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type to let browser set it with boundary
    });
  }
}

export default new ApiService();