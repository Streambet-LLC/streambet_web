import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleLoadingIcon = () => (
  <svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
    <circle cx="24" cy="24" r="20" stroke="#4285F4" strokeWidth="4" fill="none" />
    <path d="M44 24c0-11.046-8.954-20-20-20" stroke="#34A853" strokeWidth="4" fill="none" />
    <path d="M4 24c0 11.046 8.954 20 20 20" stroke="#FBBC05" strokeWidth="4" fill="none" />
    <path d="M24 44c11.046 0 20-8.954 20-20" stroke="#EA4335" strokeWidth="4" fill="none" />
  </svg>
);

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('token');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    // Handle OAuth errors
    if (error) {
      setError(`OAuth error: ${error}`);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Check if we have tokens
    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Give a short delay for UX
      setTimeout(() => {
        if (redirectParam) {
          navigate(redirectParam);
        } else {
          navigate('/');
        }
      }, 1000);
    } else {
      setError('No authentication tokens found');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [navigate, redirectParam]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexDirection: 'column' }}>
        <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <GoogleLoadingIcon />
    </div>
  );
};

export default GoogleCallback; 
