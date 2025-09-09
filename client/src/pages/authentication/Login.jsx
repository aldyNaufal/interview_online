import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const {
    isLogin,
    formData,
    loading,
    error,
    success,
    userData,
    handleSubmit,
    handleInputChange,
    handleLogout,
    testProtectedRoute,
    toggleAuthMode,
    getAllUsers,
    updateUserRole,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  // Local state for admin functionality
  const [allUsers, setAllUsers] = useState(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // REMOVED THE CONFLICTING useEffect HERE
  // The useAuth hook will handle redirects with window.location.href

  // Custom submit handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const result = await handleSubmit(e);
    return result;
  };

  const handleLogoutWithRedirect = () => {
    handleLogout();
    navigate('/login');
  };

  const handleGetAllUsers = async () => {
    const users = await getAllUsers();
    if (users) {
      setAllUsers(users);
      setShowUserManagement(true);
    }
  };

  // Handle role update
  const handleRoleUpdate = async (userId, newRole) => {
    const result = await updateUserRole(userId, newRole);
    if (result) {
      // Refresh users list
      await handleGetAllUsers();
    }
  };

  // If user is already authenticated, show a loading state or redirect message
  if (isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A0C878] mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Login/Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-[#C6EBC5] to-[#A0C878] rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin 
              ? 'Sign in to access your account and continue your journey.' 
              : 'Join us today and start your journey with us.'
            }
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A0C878] focus:border-[#A0C878] focus:z-10 transition-all duration-200"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>
            
            {/* Email Field - only show for registration */}
            {!isLogin && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A0C878] focus:border-[#A0C878] focus:z-10 transition-all duration-200"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            )}
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A0C878] focus:border-[#A0C878] focus:z-10 transition-all duration-200"
                placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
                value={formData.password}
                onChange={handleInputChange}
              />
              {!isLogin && (
                <p className="mt-2 text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <svg className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <svg className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#A0C878] to-[#8fb56a] hover:from-[#8fb56a] hover:to-[#7da459] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A0C878] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white group-hover:text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isLogin ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    )}
                  </svg>
                )}
              </span>
              {loading ? (
                <span className="flex items-center">
                  <span className="ml-3">{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </span>
              ) : (
                <span className="ml-3">{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </div>

          {/* Toggle between login and register */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-[#A0C878] hover:text-[#8fb56a] font-medium transition-colors duration-200 hover:underline"
              >
                {isLogin ? 'Create one here' : 'Sign in here'}
              </button>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            By {isLogin ? 'signing in' : 'creating an account'}, you agree to our{' '}
            <a href="#" className="text-[#A0C878] hover:text-[#8fb56a] underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#A0C878] hover:text-[#8fb56a] underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;