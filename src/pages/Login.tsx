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
import { GoogleLogin } from '@react-oauth/google';
import { decodeIdToken } from '@/utils/format';
import { GeolocationResult, verifyUserLocation } from '@/integrations/api/geolocation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
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
    mutationFn: async (credentials: { email: string; password: string }) => {
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
        description: error.message || 'Invalid email or password. Please try again.',
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
        description: error.message || 'Failed to authenticate with Google. Please try again.',
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

    loginMutation.mutate({ email, password });
  };

  const handleLoginSuccess = (credentialResponse: any) => {
    const userResponse = decodeIdToken(credentialResponse?.credential);
    if (userResponse) {
      if (userResponse.email) setEmail(userResponse.email);
    }
  };

  const handleLoginFailure = () => {
    toast({
      variant: 'destructive',
      title: 'Error signup with google',
      description: 'Please try again',
    });
  };

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
    const googleButton = googleLoginRef.current?.querySelector('div[role="button"]');
    if (googleButton instanceof HTMLElement) {
      googleButton.click();
    }
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
    <div className="container flex items-center justify-center min-h-screen py-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants}>
          <Card className="border-border/40 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            {renderLocationWarning()}
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? 'Logging in...' : 'Login'}
                  </Button>
                </motion.div>
                <motion.div variants={itemVariants} className="relative flex items-center">
                  <div className="flex-1 border-t"></div>
                  <div className="mx-4 text-sm text-muted-foreground">or</div>
                  <div className="flex-1 border-t"></div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={googleLoginMutation.isPending}
                  >
                    <FaGoogle className="mr-2" />
                    Continue with Google
                  </Button>
                  <div ref={googleLoginRef} className="hidden">
                    <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} />
                  </div>
                </motion.div>
              </CardContent>
            </form>
            <CardFooter className="flex flex-col space-y-2">
              <motion.div variants={itemVariants} className="text-center w-full">
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
  );
}
