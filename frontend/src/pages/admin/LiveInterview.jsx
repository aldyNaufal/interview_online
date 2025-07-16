// pages/LiveInterview.jsx
export default function LiveInterview() {
  return (
    <div className="h-full w-full p-8 left-10" style={{ backgroundColor: '#FFFDF6' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Live Interview</h2>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Interviews</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <h4 className="font-medium text-gray-800">Technical Interview - Senior Developer</h4>
                    <p className="text-sm text-gray-600">Today at 3:00 PM</p>
                    <p className="text-sm text-blue-600">Interviewer: John Smith</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Join Now
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">HR Interview - Final Round</h4>
                    <p className="text-sm text-gray-600">Tomorrow at 10:00 AM</p>
                    <p className="text-sm text-gray-600">Interviewer: Sarah Johnson</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">
                    Scheduled
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Interview History</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Frontend Developer Interview</h4>
                    <p className="text-sm text-gray-600">Completed: 3 days ago</p>
                    <p className="text-sm text-gray-600">Duration: 45 minutes</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}