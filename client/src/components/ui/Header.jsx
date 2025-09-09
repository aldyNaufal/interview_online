import React, { useState } from 'react';
import { Camera, Users, Copy, CheckCircle, PhoneOff, ArrowLeft, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateRoomLink, copyToClipboard } from '../../utils/helpers.js';
import { COPY_TIMEOUT } from '../../utils/constants.js';

const Header = ({ roomName, participantName, participantCount, onLeaveRoom, userData, onLogout }) => {
  const [copied, setCopied] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleCopyRoomLink = async () => {
    const roomLink = generateRoomLink(roomName, participantName);
    console.log('Copying room link:', roomLink);
    
    const success = await copyToClipboard(roomLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_TIMEOUT);
    }
  };

  const handleLeaveRoom = async () => {
    await onLeaveRoom();
  };

  const handleLogout = async () => {
    await onLeaveRoom(); // Leave room first
    onLogout(); // Then logout
    navigate('/login'); // Navigate to login page
  };

  const handleBackClick = () => {
    // Get previous route from session storage or default to home based on user role
    const previousRoute = sessionStorage.getItem('previousRoute');
    const defaultRoute = userData?.role === 'admin' ? '/admin-home' : '/user-home';
    
    onLeaveRoom().then(() => {
      navigate(previousRoute || defaultRoute);
    });
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={handleBackClick}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
            title="Back to previous page"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{roomName}</h1>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* User info and menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">{userData?.username}</span>
              <span className="text-xs text-gray-400">({userData?.role})</span>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 min-w-48 z-50">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-white font-medium">{userData?.username}</p>
                  <p className="text-gray-400 text-sm">{userData?.email}</p>
                  <p className="text-gray-500 text-xs">{userData?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleCopyRoomLink}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Share
              </>
            )}
          </button>
          
          <button
            onClick={handleLeaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>
      
      {/* Close user menu when clicking outside */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default Header;