// pages/VideoInterview.jsx
export default function VideoInterview() {
  return (
    <div className="h-full w-full p-8 left-10" style={{ backgroundColor: '#FFFDF6' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Video Interview</h2>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recorded Interviews</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div>
                    <h4 className="font-medium text-gray-800">Behavioral Interview Questions</h4>
                    <p className="text-sm text-gray-600">5 questions • 30 minutes</p>
                    <p className="text-sm text-purple-600">Status: Ready to start</p>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Start Recording
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Technical Assessment</h4>
                    <p className="text-sm text-gray-600">3 questions • 45 minutes</p>
                    <p className="text-sm text-gray-600">Status: Submitted</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Submitted
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Practice Sessions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Mock Interview</h4>
                  <p className="text-sm text-gray-600 mb-3">Practice with AI interviewer</p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Practice
                  </button>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Question Bank</h4>
                  <p className="text-sm text-gray-600 mb-3">Common interview questions</p>
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Browse Questions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}