import React, { useState } from 'react';
import { 
  UserPlus, Settings, Trash2, UserX, UserCheck, EyeOff 
} from 'lucide-react';
import CreateRoomModal from './CreateRoomModal';
import ManageRoomModal from './ManageRoomModal';

const BreakoutRoomsPanel = ({ 
  breakoutRooms, 
  participants, 
  onCreateRoom,
  onManageRoom,
  onDeleteRoom,
  onAssignToRoom,
  onRemoveFromRoom,
  onTogglePermission 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleCreateRoom = (roomName, selectedParticipants) => {
    onCreateRoom(roomName, selectedParticipants);
  };

  const handleManageRoom = (room) => {
    setSelectedRoom(room);
    setShowManageModal(true);
  };

  return (
    <>
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">Breakout Rooms Management</h3>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Create Room
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {breakoutRooms.map(room => (
            <div key={room.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{room.name}</h4>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${room.isOpen ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="text-sm text-gray-500">{room.participants.length} active</span>
                  </div>
                  <button 
                    onClick={() => handleManageRoom(room)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteRoom(room.id)}
                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="text-sm font-medium text-gray-700">Active Participants:</div>
                {room.participants.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No participants in room</div>
                ) : (
                  room.participants.map(participantId => {
                    const participant = participants.find(p => p.id === participantId);
                    return (
                      <div key={participantId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                            {participant?.name.charAt(0)}
                          </div>
                          <span className="text-sm">{participant?.name}</span>
                        </div>
                        <button 
                          onClick={() => onRemoveFromRoom(room.id, participantId)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove from room"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Allowed Users:</div>
                {room.allowedUsers.map(participantId => {
                  const participant = participants.find(p => p.id === participantId);
                  const isInRoom = room.participants.includes(participantId);
                  return (
                    <div key={participantId} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                          {participant?.name.charAt(0)}
                        </div>
                        <span className="text-sm">{participant?.name}</span>
                        {isInRoom && <span className="text-xs text-green-600">(Active)</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isInRoom && (
                          <button 
                            onClick={() => onAssignToRoom(room.id, participantId)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Assign to room"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => onTogglePermission(room.id, participantId)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove permission"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-3 flex gap-2">
                <button className="flex-1 text-sm text-blue-600 hover:text-blue-800 py-1 border border-blue-200 rounded hover:bg-blue-50">
                  Join Room
                </button>
                <button className="flex-1 text-sm text-green-600 hover:text-green-800 py-1 border border-green-200 rounded hover:bg-green-50">
                  Broadcast Message
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        participants={participants}
        onCreate={handleCreateRoom}
      />

      <ManageRoomModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        room={selectedRoom}
        participants={participants}
        onTogglePermission={onTogglePermission}
      />
    </>
  );
};

export default BreakoutRoomsPanel;