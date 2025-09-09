import React from 'react';
import useAuth from '../../hooks/useAuth';

const Signup = () => {
  const {
    formData,
    loading,
    error,
    success,
    handleSubmit,
    handleInputChange,
    validateEmail,
    validateUsername,
    validatePassword,
  } = useAuth();

  // Real-time validation feedback
  const getFieldValidation = (fieldName) => {
    if (!formData[fieldName]) return null;
    
    switch (fieldName) {
      case 'username':
        return validateUsername(formData.username) 
          ? { isValid: true, message: 'Username looks good!' }
          : { isValid: false, message: 'Username must be 3-50 characters, alphanumeric only' };
      
      case 'email':
        return validateEmail(formData.email)
          ? { isValid: true, message: 'Valid email address' }
          : { isValid: false, message: 'Please enter a valid email address' };
      
      case 'password':
        return validatePassword(formData.password)
          ? { isValid: true, message: 'Password strength: Good' }
          : { isValid: false, message: 'Password must be at least 6 characters long' };
      
      default:
        return null;
    }
  };

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
          <h2 className="text-3xl font-extrabold text-gray-900">Join Us Today!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start exploring amazing features!
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`relative block w-full px-4 py-3 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:z-10 transition-all duration-200 ${
                  formData.username
                    ? validateUsername(formData.username)
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-[#A0C878] focus:border-[#A0C878]'
                }`}
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
              />
              {formData.username && (
                <div className={`mt-2 text-xs flex items-center ${
                  getFieldValidation('username')?.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    {getFieldValidation('username')?.isValid ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  {getFieldValidation('username')?.message}
                </div>
              )}
            </div>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`relative block w-full px-4 py-3 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:z-10 transition-all duration-200 ${
                  formData.email
                    ? validateEmail(formData.email)
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-[#A0C878] focus:border-[#A0C878]'
                }`}
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleInputChange}
              />
              {formData.email && (
                <div className={`mt-2 text-xs flex items-center ${
                  getFieldValidation('email')?.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    {getFieldValidation('email')?.isValid ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  {getFieldValidation('email')?.message}
                </div>
              )}
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`relative block w-full px-4 py-3 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:z-10 transition-all duration-200 ${
                  formData.password
                    ? validatePassword(formData.password)
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-[#A0C878] focus:border-[#A0C878]'
                }`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
              {formData.password && (
                <div className={`mt-2 text-xs flex items-center ${
                  getFieldValidation('password')?.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    {getFieldValidation('password')?.isValid ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  {getFieldValidation('password')?.message}
                </div>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                )}
              </span>
              {loading ? (
                <span className="flex items-center">
                  <span className="ml-3">Creating Account...</span>
                </span>
              ) : (
                <span className="ml-3">Create Account</span>
              )}
            </button>
          </div>

          {/* Navigation to Login */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-[#A0C878] hover:text-[#8fb56a] font-medium transition-colors duration-200 hover:underline">
                Sign in instead
              </a>
            </p>
          </div>

          {/* Account Requirements Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Account Requirements
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Username: 3-50 characters, letters, numbers, and underscores only</li>
              <li>• Email: Valid email address for account verification</li>
              <li>• Password: Minimum 6 characters for security</li>
              <li>• New accounts are created with USER role by default</li>
            </ul>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            By creating an account, you agree to our{' '}
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

export default Signup;