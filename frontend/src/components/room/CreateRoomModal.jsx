import React, { useState } from 'react';

const CreateRoomModal = ({ 
  isOpen, 
  onClose, 
  participants, 
  onCreate 
}) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  const toggleParticipantSelection = (participantId) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleCreate = () => {
    if (newRoomName.trim() && selectedParticipants.length > 0) {
      onCreate(newRoomName.trim(), selectedParticipants);
      setNewRoomName('');
      setSelectedParticipants([]);
      onClose();
    }
  };

  const handleClose = () => {
    setNewRoomName('');
    setSelectedParticipants([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-96 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">Create New Breakout Room</h3>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Allow Access for:</label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {participants.filter(p => !p.isHost).map(participant => (
                <label key={participant.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(participant.id)}
                    onChange={() => toggleParticipantSelection(participant.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{participant.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button 
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={!newRoomName.trim() || selectedParticipants.length === 0}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-300"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;