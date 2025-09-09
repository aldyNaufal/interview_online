import { useState } from 'react';
import { X, Eye, EyeOff, Copy, Check } from 'lucide-react';

// API configuration - update these URLs to match your backend
const API_BASE_URL = 'http://localhost:8000/api'; // Update this
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`, // Adjust based on your auth implementation
  'Content-Type': 'application/json'
});

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Create New Meeting Modal
export const CreateMeetingModal = ({ isOpen, onClose, onCreateMeeting }) => {
  const [formData, setFormData] = useState({
    roomName: '',
    password: '',
    maxParticipants: 10,
    isPrivate: false,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!formData.roomName.trim()) {
      setError('Room name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/room`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roomName: formData.roomName,
          password: formData.password || null,
          maxParticipants: formData.maxParticipants,
          isPrivate: formData.isPrivate,
          metadata: formData.description || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create room');
      }

      const newRoom = await response.json();
      
      setCreatedRoom({
        roomId: newRoom.roomId,
        roomName: newRoom.roomName,
        hasPassword: newRoom.hasPassword,
        isPrivate: newRoom.isPrivate,
        maxParticipants: newRoom.maxParticipants
      });
      
      onCreateMeeting?.(newRoom);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          roomName: '',
          password: '',
          maxParticipants: 10,
          isPrivate: false,
          description: ''
        });
        setCreatedRoom(null);
        setCopied(false);
        onClose();
      }, 5000);
      
    } catch (err) {
      setError(err.message || 'Failed to create meeting room');
    } finally {
      setLoading(false);
    }
  };

  const copyRoomId = async (roomId) => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID');
    }
  };

  if (createdRoom) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Meeting Room Created!">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-green-800">
              <h3 className="font-semibold mb-2">Room Successfully Created</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Room Name:</span>
                  <span className="font-medium">{createdRoom.roomName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Room ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                      {createdRoom.roomId}
                    </span>
                    <button
                      onClick={() => copyRoomId(createdRoom.roomId)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      title="Copy Room ID"
                    >
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Max Participants:</span>
                  <span>{createdRoom.maxParticipants}</span>
                </div>
                {createdRoom.hasPassword && (
                  <div className="flex justify-between">
                    <span>Password:</span>
                    <span className="text-green-600">✓ Protected</span>
                  </div>
                )}
                {createdRoom.isPrivate && (
                  <div className="flex justify-between">
                    <span>Visibility:</span>
                    <span className="text-orange-600">Private</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Share Instructions:</strong> Send the Room ID to participants so they can join your meeting. 
              {createdRoom.hasPassword && ' Make sure to also share the password.'}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Meeting">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
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
            disabled={loading}
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
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={loading}
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
            disabled={loading}
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
              disabled={loading}
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
            disabled={loading}
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#74B49B] text-white rounded-lg hover:bg-[#5a8a75] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Join Meeting Modal
export const JoinMeetingModal = ({ isOpen, onClose, onJoinMeeting }) => {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Get participant name from user context/localStorage when modal opens
  useState(() => {
    if (isOpen) {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      setParticipantName(userData.username || 'User');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!roomId.trim()) {
      setError('Room ID is required');
      return;
    }
    
    if (!participantName.trim()) {
      setError('Your name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // FIXED: Use correct endpoint structure
      const token = sessionStorage.getItem('access_token');
      const tokenType = sessionStorage.getItem('token_type') || 'Bearer';
      
      if (!token) {
        throw new Error('Please log in first');
      }

      // Step 1: Verify room access (matches backend)
      const verifyResponse = await fetch(`${API_BASE_URL}/join-room`, {
        method: 'POST',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room_id: roomId.trim(),
          password: password || null
        })
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.detail || 'Failed to verify room access');
      }

      const roomInfo = await verifyResponse.json();

      // Step 2: Generate LiveKit token (FIXED: use correct endpoint)
      const tokenResponse = await fetch(`${API_BASE_URL}/livekit/token`, {
        method: 'POST',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomName: roomInfo.roomName,
          participantName: participantName.trim(),
          roomId: roomId.trim(),
          roomPassword: password || null
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.detail || 'Failed to generate access token');
      }

      const tokenData = await tokenResponse.json();
      
      // Pass the complete join data to parent component
      onJoinMeeting?.({
        token: tokenData.token,
        wsUrl: tokenData.wsUrl,
        roomName: tokenData.roomName,
        participantName: tokenData.participantName,
        roomInfo: tokenData.roomInfo
      });
      
      // Reset form
      setRoomId('');
      setPassword('');
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to join meeting. Please check your Room ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Meeting">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B] font-mono"
            placeholder="Enter 12-character Room ID"
            maxLength={12}
            disabled={loading}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            placeholder="Enter your display name"
            disabled={loading}
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
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
              placeholder="Enter room password if needed"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#74B49B] text-white rounded-lg hover:bg-[#5a8a75] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Joining...' : 'Join Meeting'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Schedule Meeting Modal (Simplified for demo)
export const ScheduleMeetingModal = ({ isOpen, onClose, onScheduleMeeting }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    duration: '60'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.date || !formData.time) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // This would integrate with your scheduling system
      // For now, this is just a placeholder
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onScheduleMeeting?.(formData);
      
      // Reset form
      setFormData({
        title: '',
        date: '',
        time: '',
        duration: '60'
      });
      onClose();
      
    } catch (err) {
      setError('Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Meeting">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            placeholder="Enter meeting title"
            disabled={loading}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
              min={new Date().toISOString().split('T')[0]}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time *
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({...prev, time: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({...prev, duration: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#74B49B]"
            disabled={loading}
          >
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#74B49B] text-white rounded-lg hover:bg-[#5a8a75] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </Modal>
  );
};