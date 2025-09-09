// pages/Assignment.jsx
export default function Assignment() {
  return (
    <div className="h-full w-full p-8 left-10" style={{ backgroundColor: '#FFFDF6' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Assignment</h2>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Assignments</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Frontend Development Task</h4>
                    <p className="text-sm text-gray-600">Due: Tomorrow</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    In Progress
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Database Design</h4>
                    <p className="text-sm text-gray-600">Due: Next Week</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Not Started
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Completed Assignments</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">React Component Development</h4>
                    <p className="text-sm text-gray-600">Completed: 2 days ago</p>
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