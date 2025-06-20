import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/integrations/api/client';
import { motion } from 'framer-motion';
import { FaGoogle } from 'react-icons/fa';
import { z } from 'zod';
import { GeolocationResult, verifyUserLocation } from '@/integrations/api/geolocation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { decodeIdToken, getMessage } from '@/utils/helper';

const loginSchema = z.object({
  email: z.string().min(1, 'Email/Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationStatus, setLocationStatus] = useState<GeolocationResult | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);
  const googleLoginRef = useRef<HTMLDivElement>(null);

  // Check user location on component mount
  useEffect(() => {
    const checkLocation = async () => {
      setIsCheckingLocation(true);
      try {
        const result = await verifyUserLocation();
        setLocationStatus(result);

        if (!result.allowed) {
          toast({
            variant: 'destructive',
            title: 'Location Restricted',
            description: result.error,
          });
        }
      } catch (error) {
        console.error('Location check failed:', error);
        setLocationStatus({
          allowed: true,
          error: 'Could not verify location. Proceeding anyway.',
        });
      } finally {
        setIsCheckingLocation(false);
      }
    };

    checkLocation();
  }, [toast]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { identifier: string; password: string }) => {
      return await api.auth.login(credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: getMessage(error) || 'Invalid email or password. Please try again.',
      });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      return api.auth.googleAuth();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Google login failed',
        description: getMessage(error) || 'Failed to authenticate with Google. Please try again.',
      });
    },
  });

  const validateForm = () => {
    try {
      loginSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Display location restriction warning if needed
  const renderLocationWarning = () => {
    if (!locationStatus) return null;

    if (!locationStatus?.allowed) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Location Restricted</AlertTitle>
          <AlertDescription>{locationStatus.error}</AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't proceed if location is restricted
    if (locationStatus && !locationStatus.allowed) {
      toast({
        variant: 'destructive',
        title: 'Location Restricted',
        description: locationStatus.error,
      });
      return;
    }

    if (!validateForm()) return;

    loginMutation.mutate({ identifier: email, password });
  };

  // const handleLoginSuccess = (credentialResponse: any) => {
  //   const userResponse = decodeIdToken(credentialResponse?.credential);
  //   if (userResponse) {
  //     if (userResponse.email) setEmail(userResponse.email);
  //   }
  // };

  // const handleLoginFailure = () => {
  //   toast({
  //     variant: 'destructive',
  //     title: 'Error signup with google',
  //     description: 'Please try again',
  //   });
  // };
  

  const handleGoogleLogin = async () => {
    // Don't proceed if location is restricted
    if (locationStatus && !locationStatus.allowed) {
      toast({
        variant: 'destructive',
        title: 'Location Restricted',
        description: locationStatus.error,
      });
      return;
    }

    // Trigger the Google login button click
    // const googleButton = googleLoginRef.current?.querySelector('div[role="button"]');
    // if (googleButton instanceof HTMLElement) {
    //   googleButton.click();
    // }
  
  
      // Trigger the Google login button click
      // const googleButton = googleLoginRef.current?.querySelector('div[role="button"]');
      // if (googleButton instanceof HTMLElement) {
      //   googleButton.click();
      // }
      googleLoginMutation.mutateAsync();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <>
      <div className="auth-bg-gradient" />
      <div className="container flex justify-center min-h-screen pt-16 pb-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-md"
        >
          <div className="mb-6">
            <img src="/logo.png" alt="StreamBet Logo" className="mb-4" />
            <h1 className="text-3xl font-bold text-white text-left">Log in</h1>
            <p className="text-[#FFFFFFBF] mt-2 text-left">
              Welcome back! Please enter your details.
            </p>
          </div>
          <motion.div variants={itemVariants}>
            <Card className="bg-transparent border-0 p-0">
              {renderLocationWarning()}
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 p-0">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email">Email or Username</Label>
                    <Input
                      id="email"
                      placeholder="Email or Username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`bg-[#272727]/80 border-gray-700 text-white placeholder:text-gray-400 ${errors.email ? 'border-destructive' : ''}`}
                    />
                    {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`bg-[#272727]/80 border-gray-700 text-white placeholder:text-gray-400 ${errors.password ? 'border-destructive' : ''}`}
                    />
                    {errors.password && (
                      <p className="text-destructive text-sm">{errors.password}</p>
                    )}
                  </motion.div>
                  {/* Forgot password link above submit buttons */}
                  <div className="flex justify-end mb-2">
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <motion.div variants={itemVariants}>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 bg-[#f5fbe7] border border-[#dbe7b3] text-[#3c3c3c] font-medium rounded-lg shadow-sm hover:bg-[#eaf7d1] transition-colors"
                      onClick={handleGoogleLogin}
                      disabled={googleLoginMutation.isPending}
                    >
                      <span className="mr-2">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g clipPath="url(#clip0_17_40)">
                            <path d="M19.805 10.2305C19.805 9.55078 19.7484 8.90078 19.6484 8.27344H10.2V12.0563H15.6016C15.36 13.2813 14.6016 14.2938 13.5234 14.9938V17.2438H16.6016C18.3984 15.5938 19.805 13.1875 19.805 10.2305Z" fill="#4285F4"/>
                            <path d="M10.2 20C12.7 20 14.7734 19.1688 16.6016 17.2438L13.5234 14.9938C12.5234 15.6688 11.2734 16.0813 10.2 16.0813C7.80156 16.0813 5.77344 14.4063 5.04844 12.2438H1.85156V14.5563C3.67031 17.7313 6.70156 20 10.2 20Z" fill="#34A853"/>
                            <path d="M5.04844 12.2438C4.85156 11.6688 4.73594 11.0563 4.73594 10.4188C4.73594 9.78125 4.85156 9.16875 5.04844 8.59375V6.28125H1.85156C1.15625 7.55625 0.75 8.93125 0.75 10.4188C0.75 11.9063 1.15625 13.2813 1.85156 14.5563L5.04844 12.2438Z" fill="#FBBC05"/>
                            <path d="M10.2 4.75625C11.3984 4.75625 12.4766 5.16875 13.3047 5.95625L16.6641 2.59375C14.7734 0.84375 12.7 0 10.2 0C6.70156 0 3.67031 2.26875 1.85156 5.44375L5.04844 7.75625C5.77344 5.59375 7.80156 4.75625 10.2 4.75625Z" fill="#EA4335"/>
                          </g>
                          <defs>
                            <clipPath id="clip0_17_40">
                              <rect width="19.0556" height="20" fill="white" transform="translate(0.75)"/>
                            </clipPath>
                          </defs>
                        </svg>
                      </span>
                      Sign in with Google
                    </Button>
                    {/* <div ref={googleLoginRef} className="hidden">
                      <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} />
                    </div> */}
                  </motion.div>
                </CardContent>
              </form>
              <CardFooter className="flex flex-col space-y-2">
                <motion.div variants={itemVariants} className="text-center w-full mt-1">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary hover:underline">
                      Sign up
                    </Link>
                  </p>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      </div>
      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          color: '#FFFFFF',
          fontSize: '0.95rem',
          zIndex: 10,
        }}
      >
        © Streambet 2025
      </div>
    </>
  );
}
