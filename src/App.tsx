import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ForgotPassword from './pages/ForgotPassword';
import GoogleCallback from './pages/GoogleCallback';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import VerifyEmailNotice from './pages/auth/VerifyEmailNotice';
import { AuthProvider } from '@/contexts/AuthContext';
import BugSnagErrorBoundary from './bugsnag';
import { LogoutEventHandlers } from '@/components/LogoutEventHandlers';
import PageViewTracker from '@/components/analytics/PageViewTracker';
import RouteGroup from './components/RouteGroup';
import 'react-image-crop/dist/ReactCrop.css';
import Waitlist from './pages/Waitlist';
import Analytics from './pages/Analytics';
import DeepDiveReport from './pages/DeepDiveReport';
import GoogleSheetsCallback from './pages/GoogleSheetsCallback';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * App is in private testing: the only public surface is the waitlist landing
 * page. Admins log in to reach the analytics dashboard; every other path
 * redirects to the waitlist. The Analytics page self-guards on `role === 'admin'`.
 */
const App = () => {
  return (
    <BugSnagErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <LogoutEventHandlers />
              <PageViewTracker />
              <Routes>
                {/* Public landing — the only thing non-admins see */}
                <Route path="/" element={<Waitlist />} />

                {/* Auth (admins only, in practice) */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/verify-email-notice" element={<VerifyEmailNotice />} />
                <Route path="/auth/google-callback" element={<GoogleCallback />} />

                {/* Legal */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                {/* Analytics is the admin dashboard (guarded; page self-checks admin) */}
                <Route element={<RouteGroup guard />}>
                  <Route path="/admin" element={<Navigate to="/analytics" replace />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route
                    path="/analytics/google/callback"
                    element={<GoogleSheetsCallback />}
                  />
                  <Route
                    path="/analytics/deep-dive/:id"
                    element={<DeepDiveReport />}
                  />
                </Route>

                {/* Everything else → waitlist */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </TooltipProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </BugSnagErrorBoundary>
  );
};

export default App;
