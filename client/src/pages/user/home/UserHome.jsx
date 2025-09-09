import { useState } from 'react';
import { Calendar, Clock, Users, Video, Plus, Settings, Share2, Phone } from 'lucide-react';
import { JoinMeetingModal } from '../../../components/room/MeetingModal';

export default function UserHome() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const upcomingMeetings = [
    {
      id: 1,
      title: 'Design Daily Zoom Meeting',
      time: '07:00 - 08:00',
      date: 'Today',
      participants: ['user1', 'user2', 'user3'],
      status: 'active'
    },
    {
      id: 2,
      title: 'Daily Standup Tech Conference',
      time: '10:00 - 10:30',
      date: 'Today',
      participants: ['user1', 'user2'],
      status: 'upcoming'
    },
    {
      id: 3,
      title: 'Marketing Strategy Development',
      time: '14:00 - 15:00',
      date: 'Today',
      participants: ['user1', 'user2', 'user3', 'user4'],
      status: 'upcoming'
    }
  ];

  // Updated to work with the modal's data structure
  const handleJoinMeeting = (joinData) => {
    console.log('Joining meeting:', joinData);
    // joinData will contain: { roomId, participantName, password }
    // Logic to join meeting using your existing useRoom hook or API call
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

  return (
    <div className="h-full w-full bg-white text-gray-600">
      <div className="h-full">
        {/* Main Content */}
        <div className="p-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Limited Actions */}
            <div>
              {/* Time Widget */}
              <div className="bg-[#C9E9D2] rounded-2xl p-6 flex items-center justify-between mb-10">
                <div>
                  <div className="text-4xl font-bold mb-2 text-black">{getCurrentTime()}</div>
                  <div className="text-gray-600">{getCurrentDate()}</div>
                </div>
              </div>
              
              {/* Quick Actions - Only Join Meeting */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Actions</h3>
                <div className="space-y-4">
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
                  
                  {/* Disabled Actions with Info */}
                  <div className="w-full bg-gray-300 p-6 rounded-2xl flex items-center space-x-4 opacity-50 cursor-not-allowed">
                    <Video className="w-8 h-8 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-500">Create Meeting</div>
                      <div className="text-sm text-gray-400">Admin access required</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-300 p-6 rounded-2xl flex items-center space-x-4 opacity-50 cursor-not-allowed">
                    <Calendar className="w-8 h-8 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-500">Schedule Meeting</div>
                      <div className="text-sm text-gray-400">Admin access required</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - View Only Meetings */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-[#74B49B]" />
                  Scheduled Meetings
                </h2>
                <div className="space-y-4">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="bg-[#74B49B] rounded-2xl p-4 flex items-center justify-between border border-gray-200">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1 text-white">{meeting.title}</h3>
                        <p className="text-sm text-gray-100 mb-2">{meeting.time} · {meeting.date}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-200">
                            {meeting.participants.length} participants
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {meeting.status === 'active' ? (
                          <button className="bg-[#A1C398] hover:bg-[#CFE8A9] px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white">
                            Join Now
                          </button>
                        ) : (
                          <span className="bg-gray-400 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-not-allowed">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* No meetings message */}
                {upcomingMeetings.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No scheduled meetings</p>
                    <p className="text-sm text-gray-400 mt-2">Ask an admin to schedule meetings for you</p>
                  </div>
                )}
              </div>
              
              {/* Info Card */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Limited Access:</strong> As a user, you can join meetings but cannot create or schedule new ones. Contact an admin for meeting creation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Meeting Modal */}
      <JoinMeetingModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinMeeting={handleJoinMeeting}
      />
    </div>
  );
}