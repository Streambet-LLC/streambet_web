import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/OldIndex';
import Stream from './pages/Stream';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Admin from './pages/Admin';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Compliance from './pages/Compliance';
import FAQ from './pages/FAQ';
import ForgotPassword from './pages/ForgotPassword';
import GoogleCallback from './pages/GoogleCallback';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import NotFound from './pages/NotFound';
import VerifyEmailNotice from './pages/auth/VerifyEmailNotice';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocationRestrictionProvider } from '@/contexts/LocationRestrictionContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BettingStatusProvider } from './contexts/BettingStatusContext';
import { BettingProvider } from './contexts/BettingContext';
import { HistoryType } from './enums';
import BugSnagErrorBoundary from './bugsnag';
import { LogoutEventHandlers } from '@/components/LogoutEventHandlers';
import Redeem from './components/withdraw/Redeem';
import { CoinflowPurchaseProtection } from '@coinflowlabs/react';
import { getChargebackProtectionMerchantId, getCoinFlowEnv } from '@/config/coinflow';
import Kyc from './components/withdraw/Kyc';
import RouteGroup from './components/RouteGroup';
import Profile from './pages/Profile';
import 'react-image-crop/dist/ReactCrop.css';
import Home from './pages/Home';
import Creator from './pages/Creator';
import Creators from './components/creators/Creators';
import CreatorPayoutsHistoryPage from './pages/CreatorPayoutsHistory';
import { DepositProvider } from './contexts/DepositContext';
import Deposit from './components/deposit/Deposit';
import Leaderboard from './pages/Leaderboard';
import { CookiesProvider } from 'react-cookie';
import CreatorApplication from './pages/CreatorApplication';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <BugSnagErrorBoundary>
<QueryClientProvider client={queryClient}>
  <LocationRestrictionProvider>
    <CurrencyProvider>
      <CookiesProvider>
        <AuthProvider>
          <BettingStatusProvider>
            <BettingProvider>
              <DepositProvider>
                <BrowserRouter>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <CoinflowPurchaseProtection
                      coinflowEnv={getCoinFlowEnv()}
                      merchantId={getChargebackProtectionMerchantId()}
                    />
                    <LogoutEventHandlers />
                    <Deposit />
                    <Routes>
                      {/* Auth Routes */}
                      <Route element={<RouteGroup auth />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                      </Route>

                      {/* Guarded Routes */}
                      <Route element={<RouteGroup guard />}>
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/creator" element={<Creator />} />
                        <Route path="/withdraw" element={<Redeem />} />
                        <Route path="/withdraw/verification" element={<Kyc />} />
                        <Route
                          path="/transactions"
                          element={
                            <Transactions
                              key="transactions"
                              historyType={HistoryType.Transaction}
                            />
                          }
                        />
                        <Route
                          path="/betting-history"
                          element={
                            <Transactions key="betting" historyType={HistoryType.Bet} />
                          }
                        />
                        <Route
                          path="/creator-payouts-history"
                          element={<CreatorPayoutsHistoryPage />}
                        />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/creator-application" element={<CreatorApplication />} />
                      </Route>

                      {/* Public Routes */}
                      <Route path="/:username" element={<Profile />} />
                      <Route path="/stream/:id" element={<Stream />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/compliance" element={<Compliance />} />
                      <Route path="/creators" element={<Creators />} />
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/auth/verify-email" element={<VerifyEmail />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/auth/google-callback" element={<GoogleCallback />} />
                      <Route path="/verify-email-notice" element={<VerifyEmailNotice />} />
                      <Route path="/" element={<Home />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </TooltipProvider>
                </BrowserRouter>
              </DepositProvider>
            </BettingProvider>
          </BettingStatusProvider>
        </AuthProvider>
      </CookiesProvider>
    </CurrencyProvider>
  </LocationRestrictionProvider>
</QueryClientProvider>
    </BugSnagErrorBoundary>
  );
};

export default App;
