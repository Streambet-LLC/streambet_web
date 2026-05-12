import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/integrations/api/client';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { verifyUserLocation } from '@/integrations/api/geolocation';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AvatarUploadField } from '@/components/AvatarUploadField';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebounce } from '@/lib/utils';
import { getMessage } from '@/utils/helper';
import { useLocationRestriction } from '@/contexts/LocationRestrictionContext';
import { AuthLayout } from '@/components/layout';
import Bugsnag from '@bugsnag/js';
import { useCookies } from 'react-cookie';

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cookies] = useCookies(['referral-link', 'promo-code']);
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [promoCode, setPromoCode] = useState(cookies['promo-code'] ? cookies['promo-code'] : '');
  const [refLink, setRefLink] = useState(cookies['referral-link'] ? cookies['referral-link'] : '');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const { locationResult, isCheckingLocation } = useLocationRestriction();
  const [discountReminder, setDiscountReminder] = useState<{
    code: string;
    description: string;
  } | null>(null);

  const signupSchema = z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
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
    promoCode: z.string().optional(),
    refLink: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      promoCode: '',
      refLink: '',
      tosAccepted: false,
      avatar: null,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      username: string;
      tosAccepted: boolean;
      lastKnownIp: string;
      redirect?: string;
      promoCode?: string;
      refLink?: string;
      profileImageUrl: string;
    }) => {
      // const locationResult = await verifyUserLocation();
      // if (!locationResult.allowed) {
      //   throw new Error(locationResult.error);
      // }

      return await api.auth.register(userData);
    },
    onSuccess: response => {
      toast({
        title: 'Account created!',
        description: 'Your account has been successfully created. Please verify mail to login.',
      });

      // If the code the user entered is also a cart discount code, show a
      // modal they have to dismiss so they don't miss it. Discount codes
      // work on Buy Now (and other shop purchases) but not on auctions.
      const discountInfo = response?.data?.discountCodeAlsoAvailable;
      if (discountInfo?.code) {
        setDiscountReminder({
          code: discountInfo.code,
          description: discountInfo.description,
        });
        return;
      }

      navigate('/verify-email-notice');
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
      // const locationResult = await verifyUserLocation();
      // if (!locationResult.allowed) {
      //   throw new Error(locationResult.error);
      // }
      // await fetch(`${import.meta.env.VITE_API_URL}/auth/location-check`, {
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'ngrok-skip-browser-warning': 'true',
      //   },
      // }).then(async res => {
      //   const response = await res.json();
      //   if (response?.isForcedLogout) {
      //     return Promise.reject(getMessage(response));
      //   }
      // });
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
        Bugsnag.notify(error);
      }
    };

    // Validate each field when it changes
    if (username) validateField('username', username);
    if (email) validateField('email', email);
    if (password) validateField('password', password);
    if (promoCode) validateField('promoCode', promoCode);
    if (refLink) validateField('refLink', refLink);
    if (tosAccepted) validateField('tosAccepted', tosAccepted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, username, email, password, promoCode, tosAccepted, refLink]);

  const validateForm = () => {
    setHasSubmitted(true);
    try {
      signupSchema.parse({
        username,
        email,
        password,
        promoCode,
        tosAccepted,
        refLink,
      });
      setErrors({});
      return true;
    } catch (error) {
      Bugsnag.notify(error);
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
    // Location checking is disabled
    if (locationResult && !locationResult.allowed) {
      toast({
        variant: 'destructive',
        title: 'Location Restricted',
        description: locationResult.error,
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
        const response = await api.auth.uploadImage(avatar);
        profileImageUrl = response?.data?.Key;
        setIsUploading(false);
      } catch (error) {
        Bugsnag.notify(error);
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
      profileImageUrl: profileImageUrl || undefined,
      lastKnownIp: locationResult?.ip_address,
      redirect: redirectParam || undefined,
      promoCode: promoCode || undefined,
      refLink: refLink || undefined,
    });
  };

  const handleGoogleLogin = async () => {
    if (locationResult && !locationResult.allowed) {
      toast({
        variant: 'destructive',
        title: 'Location Restricted',
        description: locationResult.error,
      });
      return;
    }

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

  const renderLocationWarning = () => {
    if (!locationResult) return null;

    if (!locationResult?.allowed) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Location Restricted</AlertTitle>
          <AlertDescription>{locationResult.error}</AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <AuthLayout title="Create an account" subtitle="Enter your details below to create an account">
      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
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
                    key={avatarInputKey}
                  />
                </div>
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.username ? 'border-destructive' : ''} ${username.length >= 3 && !username.includes(' ') ? 'pr-10' : ''} border-0 focus:border-0 focus:ring-0`}
                      disabled={false || false}
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
                  {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
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
                          <span className="text-green-500">{userAvailabilityData?.suggestion}</span>
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
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.email ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0`}
                    disabled={false || isGoogleLogin || false}
                  />
                  {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      placeholder="Enter your password"
                      onChange={e => setPassword(e.target.value)}
                      className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.password ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0 pr-10`}
                      disabled={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                  <p className="text-muted-foreground text-sm">
                    Password must be at least 8 characters and include uppercase, lowercase, number,
                    and special character.
                  </p>
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                  <Input
                    id="promoCode"
                    type="text"
                    value={promoCode}
                    placeholder="Enter promo code (optional)"
                    onChange={e => setPromoCode(e.target.value)}
                    className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.promoCode ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0`}
                    disabled={false}
                  />
                  {errors.promoCode && (
                    <p className="text-destructive text-sm">{errors.promoCode}</p>
                  )}
                  <p className="text-xs text-white/50">
                    Some promo codes also work as discount codes at checkout (Buy Now only, not
                    auctions). If yours does, you'll be reminded after signup to apply it again at
                    checkout.
                  </p>
                </motion.div>
                {/* <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="refLink">Referal Code (Optional)</Label>
                  <Input
                    id="refLink"
                    type="text"
                    value={refLink}
                    placeholder="Enter referral code (optional)"
                    onChange={e => setRefLink(e.target.value)}
                    className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.refLink ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0`}
                    disabled={false}
                  />
                  {errors.refLink && <p className="text-destructive text-sm">{errors.refLink}</p>}
                </motion.div> */}
                <motion.div variants={itemVariants} className="flex items-center space-x-2">
                  <Checkbox
                    id="tosAccepted"
                    checked={tosAccepted}
                    onCheckedChange={checked => setTosAccepted(checked as boolean)}
                    disabled={false}
                  />
                  <Label htmlFor="tosAccepted" className="text-sm pt-2 pb-2">
                    I accept the{' '}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline">
                      Terms of Use
                    </Link>
                    {' and '}
                    <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                    {'.'}
                  </Label>
                  {errors.tosAccepted && (
                    <p className="text-destructive text-sm">{errors.tosAccepted}</p>
                  )}
                </motion.div>
                {/* Sign Up button */}
                <div className="relative">
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signupMutation.isPending || isUploading || false || false}
                    >
                      {false
                        ? 'Verifying location...'
                        : signupMutation.isPending || isUploading
                          ? 'Creating account...'
                          : 'Sign Up'}
                    </Button>
                  </motion.div>
                </div>
                <motion.div variants={itemVariants}>
                  <Button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 bg-[#f5fbe7] border border-[#dbe7b3] text-[#3c3c3c] font-medium rounded-lg shadow-sm hover:bg-[#eaf7d1] transition-colors"
                    onClick={handleGoogleLogin}
                    disabled={googleLoginMutation.isPending || false || false}
                  >
                    <span className="mr-2">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_17_40)">
                          <path
                            d="M19.805 10.2305C19.805 9.55078 19.7484 8.90078 19.6484 8.27344H10.2V12.0563H15.6016C15.36 13.2813 14.6016 14.2938 13.5234 14.9938V17.2438H16.6016C18.3984 15.5938 19.805 13.1875 19.805 10.2305Z"
                            fill="#4285F4"
                          />
                          <path
                            d="M10.2 20C12.7 20 14.7734 19.1688 16.6016 17.2438L13.5234 14.9938C12.5234 15.6688 11.2734 16.0813 10.2 16.0813C7.80156 16.0813 5.77344 14.4063 5.04844 12.2438H1.85156V14.5563C3.67031 17.7313 6.70156 20 10.2 20Z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.04844 12.2438C4.85156 11.6688 4.73594 11.0563 4.73594 10.4188C4.73594 9.78125 4.85156 9.16875 5.04844 8.59375V6.28125H1.85156C1.15625 7.55625 0.75 8.93125 0.75 10.4188C0.75 11.9063 1.15625 13.2813 1.85156 14.5563L5.04844 12.2438Z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M10.2 4.75625C11.3984 4.75625 12.4766 5.16875 13.3047 5.95625L16.6641 2.59375C14.7734 0.84375 12.7 0 10.2 0C6.70156 0 3.67031 2.26875 1.85156 5.44375L5.04844 7.75625C5.77344 5.59375 7.80156 4.75625 10.2 4.75625Z"
                            fill="#EA4335"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_17_40">
                            <rect
                              width="19.0556"
                              height="20"
                              fill="white"
                              transform="translate(0.75)"
                            />
                          </clipPath>
                        </defs>
                      </svg>
                    </span>
                    Sign in with Google
                  </Button>
                </motion.div>
              </form>
            </FormProvider>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <motion.div
              variants={itemVariants}
              className="text-center w-full inline-flex flex-row justify-center items-center"
            >
              <p className="text-sm font-sm text-[rgba(255, 255, 255, 0.8)] opacity-70 drop-shadow-md mt-6">
                Already have an account?{' '}
              </p>
              <Link
                to={redirectParam ? `/login?redirect=${redirectParam}` : '/login'}
                className="text-sm text-primary hover:underline font-md drop-shadow-md mt-6 ml-2"
              >
                Log in
              </Link>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog
        open={!!discountReminder}
        onOpenChange={open => {
          if (!open && discountReminder) {
            setDiscountReminder(null);
            navigate('/verify-email-notice');
          }
        }}
      >
        <DialogContent
          className="sm:max-w-[460px] border-2 border-[#7AFF14] text-white"
          style={{ background: '#0D0D0D' }}
        >
          <DialogHeader>
            <DialogTitle>{discountReminder?.code} is also a discount code</DialogTitle>
            <DialogDescription className="text-gray-300 pt-2 space-y-2">
              <span className="block">
                <span className="text-[#BDFF00] font-semibold">
                  Get {discountReminder?.description}
                </span>
                .
              </span>
              <span className="block">
                Be sure to apply{' '}
                <span className="font-mono font-semibold text-[#BDFF00]">
                  {discountReminder?.code}
                </span>{' '}
                again at checkout to get the discount.
              </span>
              <span className="block text-white/60 text-xs pt-1">
                Discount codes work on Buy Now purchases only — they do not apply to auctions.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setDiscountReminder(null);
                navigate('/verify-email-notice');
              }}
              className="bg-electric-lime text-black font-bold rounded-md hover:bg-electric-lime-hover w-full sm:w-auto"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
