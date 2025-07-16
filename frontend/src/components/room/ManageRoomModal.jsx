import React from 'react';

const ManageRoomModal = ({ 
  isOpen, 
  onClose, 
  room, 
  participants, 
  onTogglePermission 
}) => {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-96 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">Manage {room.name}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Add More Users:</label>
              <div className="space-y-1">
                {participants.filter(p => !p.isHost && !room.allowedUsers.includes(p.id)).map(participant => (
                  <label key={participant.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      onChange={() => onTogglePermission(room.id, participant.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{participant.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">
                Close Room
              </button>
              <button className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm">
                Open Room
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageRoomModal;