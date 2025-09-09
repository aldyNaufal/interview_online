import React, { useState } from 'react';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    // Here you would typically make an API call to reset the password
    // For demonstration, we'll just simulate a success message
    setMessage(`Password reset link sent to ${email}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
      <form onSubmit={handleResetPassword} className="w-full max-w-sm">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full mb-4"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 w-full">
          Send Reset Link
        </button>
      </form>
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
}