import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import { useCallback } from 'react';

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

  const handleLogout = useCallback(async () => {
    try {
            await api.auth.signOut();          // removes tokens
            api.socket.disconnect?.();         // stop receiving socket events
            await queryClient.cancelQueries(); // halt inflight queries
            queryClient.clear();               // clear cache
            } finally {
            navigate('/login', { replace: true });
        }
    }, [navigate, queryClient]);

  return { handleLogout };
};
