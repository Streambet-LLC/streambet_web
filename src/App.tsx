import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Stream from './pages/Stream';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Admin from './pages/Admin';
import Deposit from './pages/Deposit';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
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
import { HistoryType } from './enums';
import BugSnagErrorBoundary from './bugsnag';
import { LogoutEventHandlers } from '@/components/LogoutEventHandlers';
import Redeem from './components/withdraw/Redeem';
import { CoinflowPurchaseProtection } from "@coinflowlabs/react";
import { getCoinFlowEnv, getMerchantId } from '@/config/coinflow';


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
            <AuthProvider>
              <BettingStatusProvider>
                <BrowserRouter>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <CoinflowPurchaseProtection coinflowEnv={getCoinFlowEnv()} 
                      merchantId={getMerchantId()} />
                    <LogoutEventHandlers />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/stream/:id" element={<Stream />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/deposit" element={<Deposit />} />
                      <Route path="/withdraw" element={<Redeem />} />
                      <Route path="/transactions" element={<Transactions key='transactions' historyType={HistoryType.Transaction} />} />
                      <Route path="/betting-history" element={<Transactions key='betting' historyType={HistoryType.Bet} />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/auth/google-callback" element={<GoogleCallback />} />
                      <Route path="/verify-email-notice" element={<VerifyEmailNotice />} />
                      <Route path="/auth/verify-email" element={<VerifyEmail />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </TooltipProvider>
                </BrowserRouter>
              </BettingStatusProvider>
            </AuthProvider>
          </CurrencyProvider>
      </LocationRestrictionProvider>
    </QueryClientProvider>
    </BugSnagErrorBoundary>
  );
};

export default App;
