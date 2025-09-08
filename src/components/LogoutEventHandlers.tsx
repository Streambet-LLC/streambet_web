import { useLogoutEventListeners } from '@/hooks/useLogoutEventListeners';

/**
 * A wrapper component to ensure useLogoutEventListeners is called within the React Query context.
 */
export const LogoutEventHandlers = () => {
  useLogoutEventListeners();
  return null;
};
