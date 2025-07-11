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
import Withdraw from './pages/Withdraw';
import Transactions from './pages/Transactions';
import StreamSettings from './pages/StreamSettings';
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
import { BettingStatusProvider } from './contexts/BettingStatusContext';


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
  // const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // useEffect(() => {
  //   // Check if the user is new and show welcome modal if needed
  //   const checkNewUser = async () => {
  //     try {
  //       const { data } = await api.auth.getSession();
  //       const session = data.session;

  //       if (session?.user) {
  //         // Check if the welcome modal has been shown already
  //         const hasSeenWelcome = localStorage.getItem(`welcome_seen_${session.user.id}`);

  //         if (!hasSeenWelcome && session.user.is_new_user) {
  //           setShowWelcomeModal(true);

  //           // Mark the welcome modal as seen for this user
  //           localStorage.setItem(`welcome_seen_${session.user.id}`, 'true');
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error checking new user:', error);
  //     }
  //   };

  //   checkNewUser();
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BettingStatusProvider>
          <CurrencyProvider>
            <BrowserRouter>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* <WelcomeModal open={showWelcomeModal} onOpenChange={setShowWelcomeModal} /> */}
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/stream/:id" element={<Stream />} />
                  <Route path="/stream/:id/settings" element={<StreamSettings />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/deposit" element={<Deposit />} />
                  <Route path="/withdraw" element={<Withdraw />} />
                  <Route path="/transactions" element={<Transactions />} />
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
          </CurrencyProvider>
      </BettingStatusProvider>
    </QueryClientProvider>
  );
};

export default App;
