import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import AuctionsHome from './pages/hermes/AuctionsHome';
import AuctionDetail from './pages/hermes/AuctionDetail';
import AuctionPay from './pages/hermes/AuctionPay';
import MyBids from './pages/hermes/MyBids';
import SignUp from './pages/hermes/SignUp';
import { IS_HERMES_SITE, applyHermesDocumentBranding } from './components/hermes/site';

applyHermesDocumentBranding();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** `/auctions?q=…` → `/?q=…` on the Hermes site (its marketplace lives at `/`). */
function ToHermesHome() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/', search }} replace />;
}

/** Auth, legal and bidder pages: the same on both sites. */
const sharedRoutes = (
  <>
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/auth/verify-email" element={<VerifyEmail />} />
    <Route path="/verify-email-notice" element={<VerifyEmailNotice />} />
    <Route path="/auth/google-callback" element={<GoogleCallback />} />

    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />

    {/* Hermes Auctions — public; bidding requires an account */}
    <Route path="/signup" element={<SignUp />} />
    <Route path="/auctions/me" element={<MyBids />} />
    <Route path="/auctions/:id" element={<AuctionDetail />} />
    <Route path="/auctions/:id/pay" element={<AuctionPay />} />
  </>
);

/**
 * Main site: the collectIQ landing page (with a Hermes rail), Hermes Auctions
 * under `/auctions`, and the admin dashboard, which self-guards on
 * `role === 'admin'`. Hermes sellers (admins) manage lots there.
 */
const mainSiteRoutes = (
  <>
    <Route path="/" element={<Waitlist />} />
    <Route path="/auctions" element={<AuctionsHome />} />
    {sharedRoutes}

    <Route element={<RouteGroup guard />}>
      <Route path="/admin" element={<Navigate to="/analytics" replace />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/analytics/google/callback" element={<GoogleSheetsCallback />} />
      <Route path="/analytics/deep-dive/:id" element={<DeepDiveReport />} />
    </Route>

    {/* Everything else → waitlist */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);

/**
 * Standalone Hermes Auctions buyer site (served from hermes.html, e.g. on
 * its own domain): the marketplace is the home page, and there is no
 * collectIQ or admin surface.
 */
const hermesSiteRoutes = (
  <>
    <Route path="/" element={<AuctionsHome />} />
    <Route path="/auctions" element={<ToHermesHome />} />
    <Route path="/hermes.html" element={<ToHermesHome />} />
    {sharedRoutes}
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);

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
              <Routes>{IS_HERMES_SITE ? hermesSiteRoutes : mainSiteRoutes}</Routes>
            </TooltipProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </BugSnagErrorBoundary>
  );
};

export default App;
