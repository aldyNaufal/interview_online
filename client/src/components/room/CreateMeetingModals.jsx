import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import useMeetingFlow from '../../hooks/useMeetingFlow.js';

export const CreateMeetingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { createRoom, isConnecting, error } = useMeetingFlow();
  
  const [formData, setFormData] = useState({
    roomName: '',
    password: '',
    maxParticipants: 10,
    isPrivate: false,
    description: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async () => {
    if (!formData.roomName.trim()) {
      setLocalError('Room name is required');
      return;
    }
    
    setLocalError('');
    
    try {
      // Create room first
      const roomData = await createRoom(formData);
      
      if (roomData) {
        // Get user data for participant name
        const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
        const participantName = userData.username || 'Admin';
        
        // Store meeting data for auto-join
        sessionStorage.setItem('pendingMeeting', JSON.stringify({
          roomName: formData.roomName,
          participantName,
          roomId: roomData.roomId,
          password: formData.password || null,
          autoJoin: true,
          isCreator: true
        }));
        
        // Store current route for navigation back
        sessionStorage.setItem('previousRoute', '/admin-home');
        
        // Reset form and close modal
        setFormData({
          roomName: '',
          password: '',
          maxParticipants: 10,
          isPrivate: false,
          description: ''
        });
        onClose();
        
        // Navigate to video conference
        navigate('/video-conference', {
          state: { from: '/admin-home' }
        });
      }
    } catch (error) {
      console.error('Failed to create and join meeting:', error);
      setLocalError(error.message || 'Failed to create meeting');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Meeting">
      <div className="space-y-4">
        {(error || localError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error || localError}
          </div>
        )}

        {isConnecting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm">
            Creating meeting and redirecting...
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Room Name *
          </label>
          <input
            type="text"
            value={formData.roomName}
            onChange={(e) => setFormData(prev => ({...prev, roomName: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            placeholder="Enter room name"
            disabled={isConnecting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password (Optional)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
              placeholder="Leave empty for no password"
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Participants
          </label>
          <select
            value={formData.maxParticipants}
            onChange={(e) => setFormData(prev => ({...prev, maxParticipants: parseInt(e.target.value)}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            disabled={isConnecting}
          >
            <option value={5}>5 participants</option>
            <option value={10}>10 participants</option>
            <option value={25}>25 participants</option>
            <option value={50}>50 participants</option>
            <option value={100}>100 participants</option>
          </select>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isPrivate}
              onChange={(e) => setFormData(prev => ({...prev, isPrivate: e.target.checked}))}
              className="rounded border-gray-300 text-[#74B49B] focus:ring-[#74B49B]"
              disabled={isConnecting}
            />
            <span className="text-sm font-medium text-gray-700">Private Room</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Private rooms can only be accessed via Room ID
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            rows="3"
            placeholder="Meeting description or agenda"
            disabled={isConnecting}
          />
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
            disabled={isConnecting}
            className="flex-1 px-4 py-2 bg-[#74B49B] text-white rounded-lg hover:bg-[#5a8a75] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? 'Creating & Joining...' : 'Create & Join Meeting'}
          </button>
        </div>
      </div>
    </Modal>
  );
};