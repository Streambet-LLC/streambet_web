import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogout } from './useLogout';

/**
 * Hook that listens to logout events and handles them without page refresh
 * This should be used in the main App component or a high-level component
 */
export const useLogoutEventListeners = () => {
  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  useEffect(() => {
    const handleVpnProxyDetected = () => {
        handleLogout();
    };
    const handleNavigateToLogin = () => {
        navigate('/login');
    };

    // Add event listeners for logout events
-    window.addEventListener('vpnProxyDetected', handleVpnProxyDetected);
+    // VPN/proxy detection disabled: no-op listener
+    window.addEventListener('vpnProxyDetectedDisabled', handleVpnProxyDetected);
    // Listen for custom navigation events
    window.addEventListener('navigateToLogin', handleNavigateToLogin);

    // Cleanup
-    return () => {
-      window.removeEventListener('vpnProxyDetected', handleVpnProxyDetected);
-      window.removeEventListener('navigateToLogin', handleNavigateToLogin);
-    };
+    return () => {
+      window.removeEventListener('vpnProxyDetectedDisabled', handleVpnProxyDetected);
+      window.removeEventListener('navigateToLogin', handleNavigateToLogin);
+    };
  }, [handleLogout]);
};
