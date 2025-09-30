import React from 'react';
import { Link } from 'react-router-dom';

const VerifyEmailNotice: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D] text-white">
      <div className="bg-[#1A1A1A] p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
        <p className="mb-6">Thank you for signing up!<br />
          Please check your email and verify your account before logging in.</p>
        <Link to="/" className="text-primary hover:underline font-medium">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmailNotice; 
