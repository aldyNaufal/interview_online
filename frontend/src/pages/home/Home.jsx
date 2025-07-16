import { useState } from 'react';
import { Calendar, Clock, Users, Video, Plus, Settings, Share2, Phone } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');

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

  const handleCreateMeeting = () => {
    console.log('Creating new meeting...');
    setShowNewMeetingModal(false);
    // Logic to create meeting
  };

  const handleJoinMeeting = () => {
    console.log('Joining meeting:', meetingId);
    setShowJoinModal(false);
    setMeetingId('');
    // Logic to join meeting
  };

  const handleScheduleMeeting = () => {
    console.log('Scheduling meeting:', { meetingTitle, meetingDate, meetingTime });
    setShowScheduleModal(false);
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingTime('');
    // Logic to schedule meeting
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
                <div className="space-y-4">
                  <button
                    onClick={() => setShowNewMeetingModal(true)}
                    className="w-full bg-[#B3D8A8] hover:bg-[#E4EFE7] p-6 rounded-2xl flex items-center space-x-4 transition-colors text-white"
                  >
                    <Video className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-medium">New Meeting</div>
                      <div className="text-sm opacity-75">Start an instant meeting</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full bg-[#B3D8A8] hover:bg-[#E4EFE7] p-6 rounded-2xl flex items-center space-x-4 transition-colors text-white"
                  >
                    <Plus className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-medium">Join Meeting</div>
                      <div className="text-sm opacity-75">via invitation link</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="w-full bg-[#B3D8A8] hover:bg-[#E4EFE7] p-6 rounded-2xl flex items-center space-x-4 transition-colors text-white"
                  >
                    <Calendar className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-medium">Schedule</div>
                      <div className="text-sm opacity-75">Plan your meetings</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Upcoming Meetings */}
            <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-[#74B49B]" />
                    Upcoming Events
                </h2>
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="bg-[#74B49B] rounded-2xl p-4 flex items-center justify-between border border-gray-200">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1 text-white">{meeting.title}</h3>
                      <p className="text-sm text-gray-100 mb-2">{meeting.time} · {meeting.date}</p>
                     
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="bg-[#A1C398] hover:[#CFE8A9] px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white">
                        {meeting.status === 'active' ? 'Join' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* New Meeting Modal */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Start New Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Meeting Topic</label>
                <input
                  type="text"
                  placeholder="Enter meeting topic"
                  className="w-full bg-gray-50 text-gray-600 px-4 py-2 rounded-lg border border-gray-200"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-600">Enable video</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-600">Enable audio</span>
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewMeetingModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg transition-colors text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMeeting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors text-white"
                >
                  Start Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Join Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Meeting ID</label>
                <input
                  type="text"
                  placeholder="Enter Meeting ID"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="w-full bg-[#557571] text-gray-600 px-4 py-2 rounded-lg border border-gray-200"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-600">Turn off camera</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-600">Turn off microphone</span>
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg transition-colors text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinMeeting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors text-white"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Schedule Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Meeting Title</label>
                <input
                  type="text"
                  placeholder="Enter meeting title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full bg-gray-50 text-gray-600 px-4 py-2 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full bg-gray-50 text-gray-600 px-4 py-2 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Time</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full bg-gray-50 text-gray-600 px-4 py-2 rounded-lg border border-gray-200"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg transition-colors text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleMeeting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors text-white"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}