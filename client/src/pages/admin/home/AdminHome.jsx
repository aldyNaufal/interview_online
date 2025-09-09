import { useState, useEffect } from 'react';
import { Calendar, Video, Plus, Trash2, Users, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateMeetingModal} from '../../../components/room/CreateMeetingModals.jsx';
import { JoinMeetingModal } from '../../../components/room/JoinMeetingModal.jsx';
import { ScheduleMeetingModal } from '../../../components/room/MeetingModal.jsx';
import useMeetingFlow from '../../../hooks/useMeetingFlow.js';

export default function AdminHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { getRoomList, deleteRoom } = useMeetingFlow();

  // Fetch rooms from backend
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      const roomList = await getRoomList();
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = (newRoom) => {
    console.log('Meeting room created:', newRoom);
    // Refresh the room list after creating
    fetchRooms();
  };

  const handleJoinMeeting = (joinData) => {
    console.log('Joining meeting:', joinData);
  };

  const handleScheduleMeeting = (scheduleData) => {
    console.log('Meeting scheduled:', scheduleData);
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (window.confirm(`Are you sure you want to delete room "${roomName}"?`)) {
      try {
        await deleteRoom(roomId);
        console.log('Room deleted successfully');
        // Refresh the room list
        fetchRooms();
      } catch (error) {
        console.error('Failed to delete room:', error);
        alert('Failed to delete room: ' + error.message);
      }
    }
  };

  const handleJoinRoom = (room) => {
    // Get user data for participant name
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    const participantName = userData.username || 'Admin';
    
    // Store room data for video conference
    sessionStorage.setItem('pendingMeeting', JSON.stringify({
      roomName: room.name,
      participantName,
      roomId: room.roomId,
      password: room.hasPassword ? '' : null, // Will be handled by join flow if needed
      autoJoin: true,
      isCreator: false
    }));
    
    // Store current route as previous route for navigation back
    sessionStorage.setItem('previousRoute', '/admin-home');
    
    // Navigate to video conference with state
    navigate('/video-conference', {
      state: { from: '/admin-home' }
    });
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCreationTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Rest of the component remains exactly the same...
  return (
    <div className="h-full w-full bg-white text-gray-600">
      <div className="h-full">
        {/* Main Content */}
        <div className="p-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Actions */}
            <div>
              {/* Time Widget */}
              <div className="bg-[#C9E9D2] rounded-2xl p-6 flex items-center justify-between mb-10">
                <div>
                  <div className="text-4xl font-bold mb-2 text-black">{getCurrentTime()}</div>
                  <div className="text-gray-600">{getCurrentDate()}</div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Admin Actions</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-[#B3D8A8] hover:bg-[#A1C398] p-6 rounded-2xl flex items-center space-x-4 transition-colors text-white"
                  >
                    <Video className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-medium">New Meeting</div>
                      <div className="text-sm opacity-75">Start an instant meeting</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full bg-[#B3D8A8] hover:bg-[#A1C398] p-6 rounded-2xl flex items-center space-x-4 transition-colors text-white"
                  >
                    <Plus className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-medium">Join Meeting</div>
                      <div className="text-sm opacity-75">via invitation link</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="w-full bg-[#B3D8A8] hover:bg-[#A1C398] p-6 rounded-2xl flex items-center space-x-4 transition-colors text-white"
                  >
                    <Calendar className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-medium">Schedule Meeting</div>
                      <div className="text-sm opacity-75">Plan your meetings</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Right Column - Live Rooms */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-[#74B49B]" />
                    Live Rooms
                  </h2>
                  <button
                    onClick={fetchRooms}
                    className="text-[#74B49B] hover:text-[#5a8a75] text-sm font-medium"
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                    {error}
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#74B49B]"></div>
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active rooms</p>
                    <p className="text-sm">Create a new meeting to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rooms.map((room) => (
                      <div key={room.roomId} className="bg-[#74B49B] rounded-2xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-white">{room.name}</h3>
                              {room.isPrivate && (
                                <Lock className="w-4 h-4 text-white opacity-75" />
                              )}
                              {room.hasPassword && (
                                <span className="text-xs bg-white bg-opacity-20 text-white px-2 py-1 rounded">
                                  Protected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-gray-100 text-sm">
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{room.numParticipants}/{room.maxParticipants}</span>
                              </div>
                              <span>ID: {room.roomId}</span>
                              <span>Created: {formatCreationTime(room.creationTime)}</span>
                            </div>
                            {room.metadata && (
                              <p className="text-gray-100 text-sm mt-2 opacity-75">
                                {room.metadata}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${room.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                              <span className="text-xs text-white">
                                {room.isActive ? 'Live' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-4">
                          <button 
                            onClick={() => handleJoinRoom(room)}
                            className="flex-1 bg-[#A1C398] hover:bg-[#CFE8A9] px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
                            disabled={!room.isActive}
                          >
                            {room.isActive ? 'Join' : 'Unavailable'}
                          </button>
                          <button 
                            onClick={() => handleDeleteRoom(room.roomId, room.name)}
                            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center space-x-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateMeeting={handleCreateMeeting}
      />
      
      <JoinMeetingModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinMeeting={handleJoinMeeting}
      />
      
      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onScheduleMeeting={handleScheduleMeeting}
      />
    </div>
  );
}