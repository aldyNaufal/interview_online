import { useState, useEffect } from 'react';

const useAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userData, setUserData] = useState(null);

  // API base URL - adjust this to match your FastAPI server
  const API_BASE_URL = 'http://localhost:8000/api';

  // Role-based redirect function
  const redirectBasedOnRole = (user) => {
    console.log('Redirecting user with role:', user.role); // Debug log
    
    if (user.role === 'ADMIN' || user.role === 'admin') {
      console.log('Redirecting to admin dashboard');
      window.location.href = '/admin-home';
    } else {
      console.log('Redirecting to user dashboard');
      window.location.href = '/user-home';
    }
  };

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const token = sessionStorage.getItem('access_token');
        const storedUserData = sessionStorage.getItem('user_data');
        
        if (token && storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
          console.log('Session restored for user:', parsedUserData.username, 'Role:', parsedUserData.role);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        // Clear corrupted session data
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('token_type');
        sessionStorage.removeItem('user_data');
      }
    };

    checkExistingSession();
  }, []);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username) && username.length >= 3 && username.length <= 50;
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN LOGIC
        if (!formData.username || !formData.password) {
          throw new Error('Username and password are required');
        }

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific login errors
          if (response.status === 401) {
            throw new Error('Incorrect username or password');
          }
          if (response.status === 403) {
            throw new Error('Account is deactivated. Please contact support.');
          }
          throw new Error(data.detail || 'Login failed');
        }

        // Store authentication data
        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('token_type', data.token_type);
        sessionStorage.setItem('user_data', JSON.stringify(data.user));
        
        setUserData(data.user);
        
        console.log('Login successful:', {
          user: data.user,
          role: data.user.role,
          token: data.access_token,
          tokenType: data.token_type
        });

        // Clear form data after successful login
        setFormData({ username: '', email: '', password: '' });

        // Role-based redirect with a small delay to ensure state is set
        setTimeout(() => {
          redirectBasedOnRole(data.user);
        }, 100);

      } else {
        // SIGNUP/REGISTRATION LOGIC
        
        // Client-side validation for registration
        if (!formData.username || !formData.email || !formData.password) {
          throw new Error('All fields are required for registration');
        }
        if (!validateUsername(formData.username)) {
          throw new Error('Username must be 3-50 characters and contain only letters, numbers, and underscores');
        }
        if (!validateEmail(formData.email)) {
          throw new Error('Please enter a valid email address');
        }
        if (!validatePassword(formData.password)) {
          throw new Error('Password must be at least 6 characters long');
        }

        console.log('Making registration request to:', `${API_BASE_URL}/auth/register`);
        console.log('Request data:', {
          username: formData.username,
          email: formData.email,
          password: '[HIDDEN]', // Don't log passwords
        });

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            // Note: role will be automatically set to USER by backend
          }),
        });

        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
          // Enhanced error handling matching backend responses
          if (response.status === 400) {
            // This covers validation errors from backend
            throw new Error(data.detail || 'Registration failed. Please check your input.');
          }
          if (response.status === 409) {
            throw new Error('Username or email already exists. Please choose different credentials.');
          }
          if (response.status === 500) {
            throw new Error('Server error during registration. Please try again later.');
          }
          throw new Error(data.detail || `Registration failed (${response.status})`);
        }

        // Handle successful registration
        console.log('Registration successful:', data);
        
        // Store login credentials for auto-login (before clearing form)
        const loginCredentials = {
          username: formData.username,
          password: formData.password,
        };

        // Clear form data
        setFormData({ username: '', email: '', password: '' });

        // Auto-login after successful registration
        try {
          const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginCredentials), // Use stored credentials
          });

          const loginData = await loginResponse.json();

          if (loginResponse.ok) {
            // Store authentication data
            sessionStorage.setItem('access_token', loginData.access_token);
            sessionStorage.setItem('token_type', loginData.token_type);
            sessionStorage.setItem('user_data', JSON.stringify(loginData.user));
            
            setUserData(loginData.user);
            
            console.log('Auto-login successful after registration:', {
              user: loginData.user,
              role: loginData.user.role
            });
            
            // Role-based redirect after registration with delay
            setTimeout(() => {
              redirectBasedOnRole(loginData.user);
            }, 100);
          } else {
            // If auto-login fails, switch to login mode
            setIsLogin(true);
            setFormData({ 
              username: loginCredentials.username, 
              email: '', 
              password: '' 
            });
            setSuccess('Registration successful! Please sign in with your credentials.');
          }
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          // If auto-login fails, switch to login mode
          setIsLogin(true);
          setFormData({ 
            username: loginCredentials.username, 
            email: '', 
            password: '' 
          });
          setSuccess('Registration successful! Please sign in with your credentials.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear errors when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('user_data');
    setUserData(null);
    setSuccess('Logged out successfully');
    setFormData({ username: '', email: '', password: '' });
    console.log('User logged out');
    // Redirect to login page after logout
    window.location.href = '/';
  };

  // Function to test protected route
  const testProtectedRoute = async () => {
    const token = sessionStorage.getItem('access_token');
    const tokenType = sessionStorage.getItem('token_type');
    
    if (!token) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error(data.detail || 'Failed to fetch user data');
      }

      setSuccess('Protected route accessed successfully! Your session is valid.');
      console.log('Current user data from protected route:', data);
      
      // Update user data with fresh info from server
      setUserData(data);
      sessionStorage.setItem('user_data', JSON.stringify(data));
      
    } catch (error) {
      setError(`Protected route error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // New function to get all users (admin only)
  const getAllUsers = async () => {
    const token = sessionStorage.getItem('access_token');
    const tokenType = sessionStorage.getItem('token_type');
    
    if (!token) {
      setError('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: 'GET',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(data.detail || 'Failed to fetch users');
      }

      setSuccess('Users retrieved successfully!');
      console.log('All users:', data);
      return data;
      
    } catch (error) {
      setError(`Get users error: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // New function to update user role (admin only)
  const updateUserRole = async (userId, newRole) => {
    const token = sessionStorage.getItem('access_token');
    const tokenType = sessionStorage.getItem('token_type');
    
    if (!token) {
      setError('Please login first');
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRole), // Send role as string: "USER" or "ADMIN"
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (response.status === 404) {
          throw new Error('User not found.');
        }
        throw new Error(data.detail || 'Failed to update user role');
      }

      setSuccess(`User role updated successfully to ${newRole}!`);
      console.log('Role update result:', data);
      return data;
      
    } catch (error) {
      setError(`Update role error: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    // Clear form data when switching modes
    setFormData({ username: '', email: '', password: '' });
  };

  // Helper function to check if user is authenticated
  const isAuthenticated = () => {
    const token = sessionStorage.getItem('access_token');
    const storedUserData = sessionStorage.getItem('user_data');
    
    // Check if we have both token and user data
    if (token && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // If userData state is not set but we have valid session storage, restore it
        if (!userData && parsedUserData) {
          setUserData(parsedUserData);
        }
        return true;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        return false;
      }
    }
    
    return false;
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return userData && (userData.role === 'ADMIN' || userData.role === 'admin');
  };

  return {
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
    validateEmail,
    validateUsername,
    validatePassword,
    redirectBasedOnRole,
  };
};

export default useAuth;