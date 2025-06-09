import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { verifyUserLocation, GeolocationResult } from '@/integrations/api/geolocation';
import { Checkbox } from '@/components/ui/checkbox';

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least 1 number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
  tosAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the Terms of Service',
  }),
});

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationStatus, setLocationStatus] = useState<GeolocationResult | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);

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

  const signupMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      email: string;
      password: string;
      tosAccepted: boolean;
    }) => {
      // Verify location again before proceeding with signup
      const locationResult = await verifyUserLocation();
      if (!locationResult.allowed) {
        throw new Error(locationResult.error);
      }
      return await api.auth.register(userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      toast({
        title: 'Account created!',
        description: 'Your account has been successfully created.',
      });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Failed to create account. Please try again.',
      });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      // Verify location before proceeding with Google login
      const locationResult = await verifyUserLocation();
      if (!locationResult.allowed) {
        throw new Error(locationResult.error);
      }
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
      signupSchema.parse({ username, email, password, tosAccepted });
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

    signupMutation.mutate({ username, email, password, tosAccepted });
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

    googleLoginMutation.mutate();
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

  // Display location restriction warning if needed
  const renderLocationWarning = () => {
    if (!locationStatus) return null;

    if (!locationStatus.allowed) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Location Restricted</AlertTitle>
          <AlertDescription>{locationStatus.error}</AlertDescription>
        </Alert>
      );
    }

    return null;
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
              <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
              <CardDescription className="text-center">
                Enter your details below to create your account
              </CardDescription>
            </CardHeader>

            {renderLocationWarning()}

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="your-username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className={errors.username ? 'border-destructive' : ''}
                    disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
                  />
                  {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
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
                    className={errors.password ? 'border-destructive' : ''}
                    disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
                  />
                  {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                  <p className="text-muted-foreground text-sm">
                    Password must be at least 8 characters and include uppercase, lowercase, number,
                    and special character.
                  </p>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center space-x-2">
                  <Checkbox
                    id="tosAccepted"
                    checked={tosAccepted}
                    onCheckedChange={checked => setTosAccepted(checked as boolean)}
                    disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
                  />
                  <Label htmlFor="tosAccepted" className="text-sm">
                    I accept the{' '}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>
                  </Label>
                  {errors.tosAccepted && (
                    <p className="text-destructive text-sm">{errors.tosAccepted}</p>
                  )}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      signupMutation.isPending ||
                      isCheckingLocation ||
                      (locationStatus && !locationStatus.allowed)
                    }
                  >
                    {isCheckingLocation
                      ? 'Verifying location...'
                      : signupMutation.isPending
                        ? 'Creating account...'
                        : 'Sign Up'}
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
                    disabled={
                      googleLoginMutation.isPending ||
                      isCheckingLocation ||
                      (locationStatus && !locationStatus.allowed)
                    }
                  >
                    <FaGoogle className="mr-2" />
                    Continue with Google
                  </Button>
                </motion.div>
              </CardContent>
            </form>
            <CardFooter className="flex flex-col space-y-2">
              <motion.div variants={itemVariants} className="text-center w-full">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline">
                    Log in
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
