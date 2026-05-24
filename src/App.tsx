import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NonVideo from './pages/NonVideo';
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
import BugSnagErrorBoundary from './bugsnag';
import { LogoutEventHandlers } from '@/components/LogoutEventHandlers';
import Redeem from './components/withdraw/Redeem';
import { CoinflowPurchaseProtection } from '@coinflowlabs/react';
import { getChargebackProtectionMerchantId, getCoinFlowEnv } from '@/config/coinflow';
import Kyc from './components/withdraw/Kyc';
import RouteGroup from './components/RouteGroup';
import Profile from './pages/Profile';
import Reviews from './pages/Reviews';
import 'react-image-crop/dist/ReactCrop.css';
import Home from './pages/Home';
import { DepositProvider } from './contexts/DepositContext';
import Deposit from './components/deposit/Deposit';
import Leaderboard from './pages/Leaderboard';
import { CookiesProvider } from 'react-cookie';
import { SolanaWalletProvider } from '@/integrations/solana/WalletProvider';
import { RequireWalletConnectModal } from '@/components/crypto/RequireWalletConnectModal';
import Prizes from './pages/Prizes';
import Redemptions from './pages/Redemptions';
import HowToPlay from './pages/HowToPlay';
import { DailySpin } from './pages/DailySpin';
import ShopDetail from './pages/ShopDetail';
import ShopItemDetail from './pages/ShopItemDetail';
import Shops from './pages/Shops';
import SellerShopManage from './pages/SellerShopManage';
import Inbox from './pages/Inbox';
import Watchlist from './pages/Watchlist';
import MyBids from './pages/MyBids';
import PurchaseSuccess from './pages/PurchaseSuccess';
import CartPage from './pages/CartPage';
import AuctionRetryPayment from './pages/AuctionRetryPayment';
import Analytics from './pages/Analytics';

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
              <SolanaWalletProvider>
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
                            <RequireWalletConnectModal />
                            <Routes>
                              {/* Auth Routes */}
                              <Route element={<RouteGroup auth />}>
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<SignUp />} />
                              </Route>

                              {/* Guarded Routes */}
                              <Route element={<RouteGroup guard />}>
                                <Route path="/admin" element={<Admin />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/analytics/:userId" element={<Analytics />} />
                                <Route path="/withdraw" element={<Redeem />} />
                                <Route path="/withdraw/verification" element={<Kyc />} />
                                <Route
                                  path="/transactions"
                                  element={<Transactions key="transactions" />}
                                />
                                <Route
                                  path="/betting-history"
                                  element={<Transactions key="betting-redirect" />}
                                />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/seller/shop/manage" element={<SellerShopManage />} />
                                <Route path="/daily-spin" element={<DailySpin />} />
                                <Route path="/inbox" element={<Inbox />} />
                                <Route path="/watchlist" element={<Watchlist />} />
                                <Route path="/my-bids" element={<MyBids />} />
                                <Route
                                  path="/auctions/:auctionId/retry-payment"
                                  element={<AuctionRetryPayment />}
                                />
                              </Route>

                              {/* Public Routes */}
                              <Route path="/:username" element={<Profile />} />
                              <Route path="/users/:username/reviews" element={<Reviews />} />
                              <Route path="/nonvideo/:id" element={<NonVideo />} />
                              <Route path="/privacy" element={<Privacy />} />
                              <Route path="/terms" element={<Terms />} />
                              <Route path="/compliance" element={<Compliance />} />
                              <Route path="/shops" element={<Shops />} />
                              <Route path="/prizes" element={<Prizes />} />
                              <Route path="/shop/item/:id" element={<ShopItemDetail />} />
                              <Route path="/shop/:username" element={<ShopDetail />} />
                              <Route path="/predictions" element={<Home />} />
                              <Route path="/how-to-play" element={<HowToPlay />} />
                              <Route path="/leaderboard" element={<Leaderboard />} />
                              <Route path="/faq" element={<FAQ />} />
                              <Route path="/auth/verify-email" element={<VerifyEmail />} />
                              <Route path="/forgot-password" element={<ForgotPassword />} />
                              <Route path="/reset-password" element={<ResetPassword />} />
                              <Route path="/auth/google-callback" element={<GoogleCallback />} />
                              <Route path="/verify-email-notice" element={<VerifyEmailNotice />} />
                              <Route path="/purchase-success" element={<PurchaseSuccess />} />
                              <Route path="/cart" element={<CartPage />} />
                              <Route path="/shop" element={<Prizes />} />
                              <Route path="/redemptions" element={<Redemptions />} />
                              <Route path="/" element={<Prizes />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </TooltipProvider>
                        </BrowserRouter>
                      </DepositProvider>
                    </BettingProvider>
                  </BettingStatusProvider>
                </AuthProvider>
              </SolanaWalletProvider>
            </CookiesProvider>
          </CurrencyProvider>
        </LocationRestrictionProvider>
      </QueryClientProvider>
    </BugSnagErrorBoundary>
  );
};

export default App;
