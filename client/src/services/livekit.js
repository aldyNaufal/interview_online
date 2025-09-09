// services/LiveKitService.js
import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import { ROOM_CONFIG, VIDEO_ATTACH_DELAY } from '../utils/constants.js';

export class LiveKitService {
  constructor() {
    this.room = null;
    this.callbacks = {};
    this.isConnecting = false;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.connectionPromise = null;
  }

  // Set up event callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Create and configure room with better error handling
  createRoom() {
    try {
      // Clean up existing room first
      if (this.room) {
        this.cleanupRoom();
      }

      const room = new Room({
        ...ROOM_CONFIG,
        // Add connection recovery options
        disconnectOnPageLeave: true,
        reconnectPolicy: {
          maxRetries: this.maxReconnectAttempts,
          retryDelayFunction: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000)
        }
      });
      
      // Set up event listeners with error handling - FIX: Ensure all handlers are bound correctly
      if (this.handleParticipantConnected) {
        room.on(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
      }
      if (this.handleParticipantDisconnected) {
        room.on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));
      }
      if (this.handleTrackSubscribed) {
        room.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
      }
      if (this.handleTrackUnsubscribed) {
        room.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
      }
      if (this.handleLocalTrackPublished) {
        room.on(RoomEvent.LocalTrackPublished, this.handleLocalTrackPublished.bind(this));
      }
      if (this.handleConnected) {
        room.on(RoomEvent.Connected, this.handleConnected.bind(this));
      }
      if (this.handleDisconnected) {
        room.on(RoomEvent.Disconnected, this.handleDisconnected.bind(this));
      }
      if (this.handleConnectionStateChanged) {
        room.on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChanged.bind(this));
      }
      if (this.handleReconnecting) {
        room.on(RoomEvent.ReconnectingToRoom, this.handleReconnecting.bind(this));
      }
      if (this.handleReconnected) {
        room.on(RoomEvent.ReconnectedToRoom, this.handleReconnected.bind(this));
      }

      this.room = room;
      console.log('LiveKit room created successfully');
      return room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Connect to room with improved error handling and retries
  async connect(wsUrl, token, maxRetries = 3) {
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    if (this.isConnected) {
      console.log('Already connected to room');
      return;
    }

    if (!this.room) {
      throw new Error('Room not created. Call createRoom() first.');
    }

    this.isConnecting = true;
    this.connectionPromise = this._attemptConnection(wsUrl, token, maxRetries);
    
    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  async _attemptConnection(wsUrl, token, maxRetries) {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Connection attempt ${attempt + 1}/${maxRetries}`);
        
        // Connect to room first
        await this.room.connect(wsUrl, token);
        
        // Wait for connection to be fully established
        await this._waitForConnection();
        
        // Enable media devices with error handling
        await this._enableMediaDevices();
        
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('Successfully connected to room');
        return;
        
      } catch (error) {
        lastError = error;
        console.error(`Connection attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          // Wait before retrying with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to connect after ${maxRetries} attempts: ${lastError?.message}`);
  }

  async _waitForConnection(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (this.room.state === ConnectionState.Connected) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      const checkConnection = () => {
        if (this.room.state === ConnectionState.Connected) {
          clearTimeout(timeoutId);
          resolve();
        } else if (this.room.state === ConnectionState.Disconnected) {
          clearTimeout(timeoutId);
          reject(new Error('Connection failed'));
        }
      };

      // Check connection state changes
      this.room.on(RoomEvent.Connected, () => {
        clearTimeout(timeoutId);
        resolve();
      });

      this.room.on(RoomEvent.Disconnected, () => {
        clearTimeout(timeoutId);
        reject(new Error('Connection failed'));
      });

      // Initial check
      checkConnection();
    });
  }

  async _enableMediaDevices() {
    try {
      // Enable camera and microphone with timeout
      const enablePromise = this.room.localParticipant.enableCameraAndMicrophone();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Media device timeout')), 5000)
      );
      
      await Promise.race([enablePromise, timeoutPromise]);
      console.log('Media devices enabled successfully');
    } catch (error) {
      console.warn('Failed to enable media devices:', error);
      // Don't throw here - allow connection without media if necessary
    }
  }

  // Disconnect from room with proper cleanup
  async disconnect() {
    try {
      this.isConnected = false;
      this.isConnecting = false;
      
      if (this.room && this.room.state !== ConnectionState.Disconnected) {
        await this.room.disconnect();
      }
      
      this.cleanupRoom();
      console.log('Disconnected from room successfully');
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Force cleanup even if disconnect fails
      this.cleanupRoom();
    }
  }

  cleanupRoom() {
    if (this.room) {
      // Remove all listeners to prevent memory leaks
      this.room.removeAllListeners();
      this.room = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Enhanced event handlers
  handleParticipantConnected(participant) {
    console.log('Participant connected:', participant.identity);
    
    try {
      if (this.callbacks.onParticipantConnected) {
        this.callbacks.onParticipantConnected(participant);
      }
      
      // Subscribe to existing published tracks
      participant.trackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.track) {
          this.handleTrackSubscribed(publication.track, publication, participant);
        }
      });
    } catch (error) {
      console.error('Error handling participant connected:', error);
    }
  }

  handleParticipantDisconnected(participant) {
    console.log('Participant disconnected:', participant.identity);
    
    try {
      if (this.callbacks.onParticipantDisconnected) {
        this.callbacks.onParticipantDisconnected(participant);
      }
    } catch (error) {
      console.error('Error handling participant disconnected:', error);
    }
  }

  handleTrackSubscribed(track, publication, participant) {
    console.log('Track subscribed:', track.kind, participant.identity);
    
    try {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const element = track.attach();
        
        if (track.kind === Track.Kind.Video) {
          // Use requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            if (this.callbacks.onVideoTrackSubscribed) {
              this.callbacks.onVideoTrackSubscribed(element, participant);
            }
          });
        }
        
        if (track.kind === Track.Kind.Audio) {
          element.play().catch(e => console.warn('Audio play failed:', e));
        }
      }
    } catch (error) {
      console.error('Error handling track subscribed:', error);
    }
  }

  handleTrackUnsubscribed(track, publication, participant) {
    console.log('Track unsubscribed:', track.kind, participant.identity);
    try {
      track.detach();
    } catch (error) {
      console.error('Error detaching track:', error);
    }
  }

  // FIX: Corrected handleLocalTrackPublished to match expected signature
  handleLocalTrackPublished(publication, participant) {
    console.log('Local track published:', publication.kind, participant.identity);
    
    try {
      if (this.callbacks.onLocalTrackPublished) {
        this.callbacks.onLocalTrackPublished(publication, participant);
      }
      
      // Handle video track attachment for local participant
      if (publication.kind === Track.Kind.Video && publication.track) {
        const element = publication.track.attach();
        if (element && this.callbacks.onVideoTrackSubscribed) {
          // Treat local video like a subscribed track for consistency
          requestAnimationFrame(() => {
            this.callbacks.onVideoTrackSubscribed(element, participant);
          });
        }
      }
    } catch (error) {
      console.error('Error handling local track published:', error);
    }
  }

  handleConnectionStateChanged(state) {
    console.log('Connection state changed:', state);
    
    if (this.callbacks.onConnectionStateChanged) {
      this.callbacks.onConnectionStateChanged(state);
    }
  }

  handleReconnecting() {
    console.log('Reconnecting to room...');
    this.reconnectAttempts++;
    
    if (this.callbacks.onReconnecting) {
      this.callbacks.onReconnecting(this.reconnectAttempts);
    }
  }

  handleReconnected() {
    console.log('Reconnected to room successfully');
    this.reconnectAttempts = 0;
    
    if (this.callbacks.onReconnected) {
      this.callbacks.onReconnected();
    }
  }

  handleConnected() {
    console.log('Connected to room');
    this.isConnected = true;
    
    if (this.callbacks.onConnected) {
      this.callbacks.onConnected(this.room);
    }
  }

  handleDisconnected(reason) {
    console.log('Disconnected from room:', reason);
    this.isConnected = false;
    
    if (this.callbacks.onDisconnected) {
      this.callbacks.onDisconnected(reason);
    }
  }

  // Enhanced media controls with error handling
  async toggleMicrophone(enabled) {
    try {
      if (this.room?.localParticipant) {
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling microphone:', error);
      throw error;
    }
  }

  async toggleCamera(enabled) {
    try {
      if (this.room?.localParticipant) {
        await this.room.localParticipant.setCameraEnabled(enabled);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling camera:', error);
      throw error;
    }
  }

  async toggleScreenShare(enabled) {
    try {
      if (this.room?.localParticipant) {
        await this.room.localParticipant.setScreenShareEnabled(enabled);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling screen share:', error);
      throw error;
    }
  }

  // Utility methods
  getLocalVideoTrack() {
    return this.room?.localParticipant?.videoTrackPublications.values().next().value?.track;
  }

  getLocalAudioTrack() {
    return this.room?.localParticipant?.audioTrackPublications.values().next().value?.track;
  }

  getConnectionState() {
    return this.room?.state || ConnectionState.Disconnected;
  }

  getRoom() {
    return this.room;
  }

  // Health check method
  isHealthy() {
    return this.room && this.isConnected && this.room.state === ConnectionState.Connected;
  }
}