import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import useMeetingFlow from '../../hooks/useMeetingFlow.js';

export const JoinMeetingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { verifyRoomAccess, isConnecting, error } = useMeetingFlow();
  
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  // Get participant name from user data when modal opens
  useEffect(() => {
    if (isOpen) {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      setParticipantName(userData.username || 'User');
      // Clear any previous errors
      setLocalError('');
    }
  }, [isOpen]);

  // Clear errors when user types
  useEffect(() => {
    if (localError && (roomId || participantName)) {
      setLocalError('');
    }
  }, [roomId, participantName, localError]);

  const handleSubmit = async () => {
    if (!roomId.trim()) {
      setLocalError('Room ID is required');
      return;
    }
    
    if (!participantName.trim()) {
      setLocalError('Your name is required');
      return;
    }
    
    setLocalError('');
    
    try {
      // Verify room access first
      const roomInfo = await verifyRoomAccess(roomId.trim(), password || null);
      
      if (roomInfo) {
        // Store meeting data for auto-join
        sessionStorage.setItem('pendingMeeting', JSON.stringify({
          roomName: roomInfo.name || `Room ${roomId}`,
          participantName: participantName.trim(),
          roomId: roomId.trim(),
          password: password || null,
          autoJoin: true,
          isCreator: false
        }));
        
        // Store current route for navigation back
        sessionStorage.setItem('previousRoute', '/admin-home');
        
        // Reset form and close modal
        setRoomId('');
        setPassword('');
        onClose();
        
        // Navigate to video conference
        navigate('/video-conference', {
          state: { from: '/admin-home' }
        });
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
      setLocalError(error.message || 'Failed to join meeting');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Meeting">
      <div className="space-y-4">
        {(error || localError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error || localError}
          </div>
        )}
        
        {isConnecting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm">
            Verifying access and joining meeting...
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room ID *
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B] font-mono"
            placeholder="Enter 12-character Room ID"
            maxLength={12}
            disabled={isConnecting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: ABC123DEF456
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name *
          </label>
          <input
            type="text"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            placeholder="Enter your display name"
            disabled={isConnecting}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password (if required)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
              placeholder="Enter room password if needed"
              disabled={isConnecting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isConnecting}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave empty if room has no password
          </p>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isConnecting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isConnecting || !roomId.trim() || !participantName.trim()}
            className="flex-1 px-4 py-2 bg-[#74B49B] text-white rounded-lg hover:bg-[#5a8a75] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? 'Joining...' : 'Join Meeting'}
          </button>
        </div>
      </div>
    </Modal>
  );
};