import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AvatarUploadField } from '@/components/AvatarUploadField';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleLogin } from '@react-oauth/google';
import { useDebounce } from '@/lib/utils';
import { decodeIdToken, getMessage } from '@/utils/helper';

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isOlder, setIsOlder] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [locationStatus, setLocationStatus] = useState<GeolocationResult | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');
  const googleLoginRef = useRef<HTMLDivElement>(null);

  const signupSchema = z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[^\s]*$/, 'Username cannot contain spaces'),
    email: z.string().email('Invalid email address'),
    password: isGoogleLogin
      ? z.string().optional()
      : z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
          .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
          .regex(/[0-9]/, 'Password must contain at least 1 number')
          .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
    tosAccepted: z.boolean().refine(val => val === true, {
      message: 'You must accept the Terms of Service',
    }),
    isOlder: z.boolean().refine(val => val === true, {
      message: 'You must be atleast 18 years old',
    }),
  });

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      tosAccepted: false,
      isOlder: false,
      avatar: null,
    },
  });

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

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      email: string;
      password: string;
      tosAccepted: boolean;
      isOlder: boolean;
      profileImageUrl: string;
      lastKnownIp: string;
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
        description: getMessage(error) || 'Failed to create account. Please try again.',
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

  // Add real-time validation effect that only runs after first submission
  useEffect(() => {
    if (!hasSubmitted) return;

    const validateField = (fieldName: string, value: any) => {
      try {
        signupSchema.shape[fieldName].parse(value);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: error.errors[0].message,
          }));
        }
      }
    };

    // Validate each field when it changes
    if (username) validateField('username', username);
    if (email) validateField('email', email);
    if (password) validateField('password', password);
    if (tosAccepted) validateField('tosAccepted', tosAccepted);
    if (isOlder) validateField('isOlder', isOlder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, username, email, password, tosAccepted, isOlder]);

  const validateForm = () => {
    setHasSubmitted(true);
    try {
      signupSchema.parse({ username, email, password, tosAccepted, isOlder });
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

    // Check if username is available
    if (username.length >= 3 && userAvailabilityData?.is_available === false) {
      toast({
        variant: 'destructive',
        title: 'Username not available',
        description: 'Please choose a different username or use the suggested one.',
      });
      return;
    }

    // Check if username availability check is still in progress
    if (username.length >= 3 && isUserAvailabilityFetching) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Username availability check is in progress.',
      });
      return;
    }

    // Check for avatar validation errors
    const avatarError = form.formState.errors.avatar;
    if (avatarError) {
      toast({
        variant: 'destructive',
        title: 'Invalid Profile Picture',
        description: (avatarError.message as string) || 'Please upload a valid profile picture.',
      });
      return;
    }

    const avatar = form.getValues('avatar');
    let profileImageUrl = '';

    if (avatar) {
      try {
        setIsUploading(true);
        const response = await api.auth.uploadProfilePicture(avatar);
        profileImageUrl = response?.data?.Key;
        setIsUploading(false);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error uploading profile picture',
          description: getMessage(error) || 'Failed to upload profile picture. Please try again.',
        });
        setIsUploading(false);
      }
    }

    signupMutation.mutate({
      username,
      email,
      password,
      tosAccepted,
      isOlder,
      profileImageUrl: profileImageUrl || undefined,
      lastKnownIp: locationStatus?.ip_address,
    });
  };

  const handleLoginSuccess = async (credentialResponse: any) => {
    const userResponse = decodeIdToken(credentialResponse?.credential);
    const googleResponseFromAPI: any = await api.auth.googleCallback(
      credentialResponse?.credential
    );
    if (userResponse) {
      if (userResponse.name) setUsername(userResponse.given_name);
      if (userResponse.email) setEmail(userResponse.email);
      // if (userResponse.picture) form.setValue('avatar', userResponse.picture);
    }

    window?.scrollTo({ top: 0, behavior: 'smooth' });
    setIsGoogleLogin(true);
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

  const {
    data: userAvailabilityData,
    isFetching: isUserAvailabilityFetching,
    refetch: refetchUserAvailability,
  } = useQuery({
    queryKey: ['user-availability'],
    enabled: false,
    queryFn: async () => {
      const { data, error }: any = await api.auth.getUsernameAvailability(userNameCheck);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (userNameCheck && userNameCheck?.length >= 3 && !userNameCheck.includes(' '))
      refetchUserAvailability();
  }, [refetchUserAvailability, userNameCheck]);

  const debouncedSearch = useDebounce((searchTerm: string) => {
    setUserNameCheck(searchTerm);
  });

  useEffect(() => {
    debouncedSearch(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
            <h1 className="text-3xl font-bold text-white text-left">Create an account</h1>
            <p className="text-[#FFFFFFBF] mt-2 text-left">
              Enter your details below to create an account
            </p>
          </div>
          <Card className="bg-transparent border-0 p-0">
            <CardContent className="p-0">
              {renderLocationWarning()}
              <FormProvider {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Label htmlFor="avatar">Profile Picture</Label>
                  <div className="flex justify-center space-y-2">
                    <AvatarUploadField
                      form={form}
                      name="avatar"
                      label=""
                      disabled={isUploading}
                      size="lg"
                    />
                  </div>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        placeholder="your-username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className={`bg-[#272727]/80 border-gray-700 text-white placeholder:text-gray-400 ${errors.username ? 'border-destructive' : ''} ${username.length >= 3 && !username.includes(' ') ? 'pr-10' : ''}`}
                        disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
                      />
                      {username.length >= 3 && !username.includes(' ') && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isUserAvailabilityFetching ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : userAvailabilityData?.is_available ? (
                            <svg
                              className="h-4 w-4 text-green-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : userAvailabilityData?.is_available === false ? (
                            <svg
                              className="h-4 w-4 text-destructive"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {errors.username && (
                      <p className="text-destructive text-sm">{errors.username}</p>
                    )}
                    {username.length >= 3 && !username.includes(' ') && (
                      <div className="flex items-center gap-2 text-sm">
                        {isUserAvailabilityFetching ? (
                          <span className="text-muted-foreground">
                            Checking username availability...
                          </span>
                        ) : userAvailabilityData?.is_available ? (
                          <span className="text-green-500">Username is available</span>
                        ) : userAvailabilityData?.is_available === false ? (
                          <span>
                            <span className="text-destructive">
                              Username is not available. Suggested username:{' '}
                            </span>
                            <span className="text-green-500">
                              {userAvailabilityData?.suggestion}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your-email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`bg-[#272727]/80 border-gray-700 text-white placeholder:text-gray-400 ${errors.email ? 'border-destructive' : ''}`}
                      disabled={
                        isCheckingLocation ||
                        isGoogleLogin ||
                        (locationStatus && !locationStatus.allowed)
                      }
                    />
                    {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                  </motion.div>
                  {!isGoogleLogin && (
                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={`bg-[#272727]/80 border-gray-700 text-white placeholder:text-gray-400 ${errors.password ? 'border-destructive' : ''}`}
                        disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
                      />
                      {errors.password && (
                        <p className="text-destructive text-sm">{errors.password}</p>
                      )}
                      <p className="text-muted-foreground text-sm">
                        Password must be at least 8 characters and include uppercase, lowercase,
                        number, and special character.
                      </p>
                    </motion.div>
                  )}
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
                  <motion.div variants={itemVariants} className="flex items-center space-x-2">
                    <Checkbox
                      id="isOlder"
                      checked={isOlder}
                      onCheckedChange={checked => setIsOlder(checked as boolean)}
                      disabled={isCheckingLocation || (locationStatus && !locationStatus.allowed)}
                    />
                    <Label htmlFor="isOlder" className="text-sm">
                      I confirm that I am 18 years of age or older
                    </Label>
                    {errors.isOlder && <p className="text-destructive text-sm">{errors.isOlder}</p>}
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        signupMutation.isPending ||
                        isUploading ||
                        isCheckingLocation ||
                        (locationStatus && !locationStatus.allowed)
                      }
                    >
                      {isCheckingLocation
                        ? 'Verifying location...'
                        : signupMutation.isPending || isUploading
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
                    {/* <div ref={googleLoginRef} className="hidden">
                      <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} />
                    </div> */}
                  </motion.div>
                </form>
              </FormProvider>
            </CardContent>
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
