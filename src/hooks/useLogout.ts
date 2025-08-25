import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';

/**
 * Custom hook for handling user logout functionality
 * 
 * This hook provides a handleLogout function that:
 * - Signs out the user via the API
 * - Clears the React Query cache
 * - Navigates to the login page
 * 
 * @returns {Object} Object containing the handleLogout function
 * @returns {Function} handleLogout - Async function to handle logout
 * 
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.auth.signOut();
    queryClient.clear();
    navigate('/login');
  };

  return { handleLogout };
};
