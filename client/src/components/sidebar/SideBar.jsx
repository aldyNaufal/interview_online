// utils/sidebar/SideBar.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  BookOpenCheck, 
  FileVideo2, 
  TvMinimal,
  BadgeCheck,
  LogIn,
  LogOut,
  User,
  UserPlus,
  Settings
} from "lucide-react";
import useAuth from "../../hooks/useAuth"; // Use the same hook as Login component

export default function SideBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, handleLogout, isAuthenticated } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'assignment', label: 'Assignment', icon: BookOpenCheck, path: '/assignment' },
    { id: 'video-interview', label: 'Video Interview', icon: FileVideo2, path: '/video-interview' },
    { id: 'interview-result', label: 'Interview Result', icon: TvMinimal, path: '/interview-result' },
    { id: 'match-candidates', label: 'Matching Candidates', icon: BadgeCheck, path: '/match-candidates' },
  ];

  // Authentication items based on login status
  const getAuthItems = () => {
    if (isAuthenticated()) {
      return [
        { 
          id: 'profile', 
          label: `${userData?.username || 'Profile'}`, 
          icon: User, 
          path: '/profile',
          isProfile: true
        },
        { 
          id: 'logout', 
          label: 'Logout', 
          icon: LogOut, 
          action: 'logout',
          isLogout: true
        }
      ];
    } else {
      return [
        { 
          id: 'login', 
          label: 'Login', 
          icon: LogIn, 
          path: '/'
        },
        { 
          id: 'signup', 
          label: 'Sign Up', 
          icon: UserPlus, 
          path: '/signup'
        }
      ];
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleAction = (item) => {
    if (item.action === 'logout') {
      handleLogout();
      navigate('/'); // Redirect to home after logout
    } else if (item.path) {
      handleNavigation(item.path);
    }
  };

  const authItems = getAuthItems();

  return (
    <div className="w-64 h-screen flex flex-col" style={{ backgroundColor: '#C6EBC5' }}>
      <div className="p-6 flex-1">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-800">Interview Platform</h1>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white shadow-md text-[#A0C878] font-semibold' 
                    : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Authentication Section */}
      <div className="p-6 border-t border-white border-opacity-30">
        {/* User Status Indicator - Only show when authenticated */}
        {isAuthenticated() && userData && (
          <div className="mb-4 p-3 bg-white bg-opacity-20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <User size={16} className="text-[#A0C878]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {userData.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userData.role || 'User'}
                </p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
            </div>
          </div>
        )}

        {/* Authentication Items */}
        <nav className="space-y-2">
          {authItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => handleAction(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white shadow-md text-[#A0C878] font-semibold' 
                    : item.isLogout
                      ? 'text-red-600 hover:bg-red-50 hover:bg-opacity-50'
                      : item.isProfile
                        ? 'text-blue-600 hover:bg-blue-50 hover:bg-opacity-50'
                        : 'text-gray-600 hover:bg-white hover:bg-opacity-50'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Login Status Text - Only show when not authenticated */}
        {!isAuthenticated() && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Please login to access all features
            </p>
          </div>
        )}

        {/* Additional info for authenticated users */}
        {isAuthenticated() && userData && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Welcome back! 
              {userData.role === 'ADMIN' && (
                <span className="text-purple-600 font-medium"> (Admin)</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}