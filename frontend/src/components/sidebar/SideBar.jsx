// utils/sidebar/SideBar.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpenCheck, FileVideo2, TvMinimal, BadgeCheck } from "lucide-react";

export default function SideBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "cv-filter", label: "CV Filter", icon: BookOpenCheck, path: "/cv-filter" },
    { id: "assignment", label: "Assignment", icon: BookOpenCheck, path: "/assignment" },
    { id: "video-interview", label: "Video Interview", icon: FileVideo2, path: "/video-interview" },
    { id: "live-interview", label: "Interview Result", icon: TvMinimal, path: "/live-interview" },
    { id: "match-candidates", label: "Matching Candidates", icon: BadgeCheck, path: "/match-candidates" },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="w-64 h-screen" style={{ backgroundColor: "#C6EBC5" }}>
      <div className="p-6">
        {/* Navigation Menu */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${isActive ? "bg-white shadow-md text-[#A0C878] font-semibold" : "text-gray-600 hover:bg-white hover:bg-opacity-50"}`}
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
    </div>
  );
}
