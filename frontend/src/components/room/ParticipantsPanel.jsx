import React from 'react';
import { 
  Hand, MicOff, VideoOff, Crown, ArrowRight, MoreHorizontal 
} from 'lucide-react';

const ParticipantsPanel = ({ participants, onTogglePanel }) => {
  const mainParticipants = participants.filter(p => p.status === 'main');
  
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold">Participants in Main Room ({mainParticipants.length})</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mainParticipants.map(participant => (
          <div key={participant.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {participant.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium">{participant.name}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  {participant.isHandRaised && <Hand className="w-3 h-3 text-yellow-500" />}
                  {participant.isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                  {!participant.isVideoOn && <VideoOff className="w-3 h-3 text-red-500" />}
                  {participant.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                </div>
              </div>
            </div>
            {!participant.isHost && (
              <div className="flex items-center gap-1">
                <button 
                  className="p-1 hover:bg-gray-200 rounded text-blue-600"
                  title="Assign to Breakout Room"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-gray-200 rounded">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantsPanel;