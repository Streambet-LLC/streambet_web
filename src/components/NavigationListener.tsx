import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const NavigationListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigateToLogin = () => {
      navigate('/login');
    };

    // Listen for custom navigation events
    window.addEventListener('navigateToLogin', handleNavigateToLogin);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('navigateToLogin', handleNavigateToLogin);
    };
  }, [navigate]);

  return null; // This component doesn't render anything
}; 