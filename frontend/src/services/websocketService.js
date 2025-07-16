// services/websocketService.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Map();
    this.connectionState = 'disconnected'; // disconnected, connecting, connected
    this.stateChangeCallbacks = [];
  }

  // Add state change listener
  onStateChange(callback) {
    this.stateChangeCallbacks.push(callback);
  }

  // Remove state change listener
  offStateChange(callback) {
    this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
  }

  // Notify state change
  notifyStateChange(state) {
    this.connectionState = state;
    this.stateChangeCallbacks.forEach(callback => callback(state));
  }

  // Connect to WebSocket
  connect(userId, baseUrl = 'ws://localhost:8000') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        this.notifyStateChange('connecting');
        
        const wsUrl = `${baseUrl}/ws/${userId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.notifyStateChange('connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.notifyStateChange('disconnected');
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyStateChange('disconnected');
          reject(error);
        };

      } catch (error) {
        this.notifyStateChange('disconnected');
        reject(error);
      }
    });
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // Send message
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.warn('No handler for message type:', message.type);
    }
  }

  // Register message handler
  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  // Unregister message handler
  off(messageType) {
    this.messageHandlers.delete(messageType);
  }

  // Join room
  joinRoom(roomId, userInfo) {
    return this.send({
      type: 'join_room',
      room_id: roomId,
      user_info: userInfo
    });
  }

  // Leave room
  leaveRoom(roomId) {
    return this.send({
      type: 'leave_room',
      room_id: roomId
    });
  }

  // Send chat message
  sendChatMessage(roomId, message) {
    return this.send({
      type: 'chat_message',
      room_id: roomId,
      message: message
    });
  }

  // Update media state
  updateMediaState(mediaState) {
    return this.send({
      type: 'media_state_update',
      media_state: mediaState
    });
  }

  // Send WebRTC offer
  sendOffer(targetUserId, offer) {
    return this.send({
      type: 'webrtc_offer',
      target_user_id: targetUserId,
      offer: offer
    });
  }

  // Send WebRTC answer
  sendAnswer(targetUserId, answer) {
    return this.send({
      type: 'webrtc_answer',
      target_user_id: targetUserId,
      answer: answer
    });
  }

  // Send ICE candidate
  sendIceCandidate(targetUserId, candidate) {
    return this.send({
      type: 'ice_candidate',
      target_user_id: targetUserId,
      candidate: candidate
    });
  }

  // Create breakout room
  createBreakoutRoom(roomId, breakoutRoomName) {
    return this.send({
      type: 'create_breakout_room',
      room_id: roomId,
      breakout_room_name: breakoutRoomName
    });
  }

  // Join breakout room
  joinBreakoutRoom(breakoutRoomId) {
    return this.send({
      type: 'join_breakout_room',
      breakout_room_id: breakoutRoomId
    });
  }

  // Start recording
  startRecording(roomId) {
    return this.send({
      type: 'start_recording',
      room_id: roomId
    });
  }

  // Stop recording
  stopRecording(roomId) {
    return this.send({
      type: 'stop_recording',
      room_id: roomId
    });
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.notifyStateChange('disconnected');
  }

  // Get connection state
  getConnectionState() {
    return this.connectionState;
  }

  // Check if connected
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();