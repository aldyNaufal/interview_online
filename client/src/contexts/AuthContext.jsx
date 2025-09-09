import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configure your backend URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-backend.com'  // Replace with your actual production URL
  : 'http://localhost:8000';  // Your local backend

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Making request to:', url);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add authorization header if token exists
  const token = localStorage.getItem('access_token');
  if (token) {
    defaultOptions.headers.Authorization = `Bearer ${token}`;
  }

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      // Handle different error responses
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        throw new Error('Session expired. Please login again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Call your backend's /me endpoint
      const userData = await apiRequest('/api/auth/me');
      setUser(userData);
      console.log('User authenticated:', userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);
      
      // Call your backend's login endpoint
      const loginData = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
        }),
      });

      // Store the access token
      localStorage.setItem('access_token', loginData.access_token);
      
      // Set user data from the response
      setUser(loginData.user);
      
      console.log('Login successful:', loginData.user);
      return loginData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    try {
      setError('');
      setLoading(true);
      
      // Call your backend's register endpoint
      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      console.log('Registration successful:', result);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setError('');
    console.log('User logged out');
  };

  // Get LiveKit token (for your video meetings)
  const getToken = async (roomName, participantName) => {
    try {
      const data = await apiRequest('/api/token', {
        method: 'POST',
        body: JSON.stringify({
          room_name: roomName,
          participant_name: participantName,
        }),
      });
      
      return {
        token: data.token,
        wsUrl: data.ws_url,
      };
    } catch (error) {
      console.error('Failed to get token:', error);
      throw new Error('Failed to get access token. Please check your login status.');
    }
  };

  // Additional API methods that might be useful
  const getCurrentUser = async () => {
    return await apiRequest('/api/auth/me');
  };

  const getRooms = async () => {
    return await apiRequest('/api/rooms');
  };

  const createRoom = async (roomName, maxParticipants = 10) => {
    return await apiRequest('/api/admin/room', {
      method: 'POST',
      body: JSON.stringify({
        room_name: roomName,
        max_participants: maxParticipants,
      }),
    });
  };

  const getRoomInfo = async (roomName) => {
    return await apiRequest(`/api/room/${roomName}`);
  };

  // Check if user has admin role
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Check if user has user role
  const isUser = () => {
    return user?.role === 'user';
  };

  const value = {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,
    
    // Role checks
    isAdmin: isAdmin(),
    isUser: isUser(),
    
    // Auth methods
    login,
    register,
    logout,
    checkAuthStatus,
    
    // API methods
    getToken,
    getCurrentUser,
    getRooms,
    createRoom,
    getRoomInfo,
    
    // Utility
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};