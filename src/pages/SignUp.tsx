import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { useDebounce } from '@/lib/utils';
import { decodeIdToken, getMessage } from '@/utils/helper';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLocationRestriction } from '@/contexts/LocationRestrictionContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isOlder, setIsOlder] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');
  const googleLoginRef = useRef<HTMLDivElement>(null);
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const lastClickTimeRef = useRef<number>(0);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const { locationResult } = useLocationRestriction();


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
    dob: z
      .date({ required_error: 'Date of Birth is required' })
      .refine(
        (date) => {
          if (!date) return false;
          const now = new Date();
          const minAge = 18;
          const minDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
          return date <= minDate;
        },
        { message: 'You must be at least 18 years old' }
      ),
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
      dob: undefined,
      tosAccepted: false,
      isOlder: false,
      avatar: null,
    },
  });

  // Initialize currentMonth when component mounts
  useEffect(() => {
    setCurrentMonth(new Date());
  }, []);

  const signupMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      email: string;
      password: string;
      dob: string | undefined;
      tosAccepted: boolean;
      isOlder: boolean;
      profileImageUrl: string;
      lastKnownIp: string;
      redirect?: string;
    }) => {
      // Verify location again before proceeding with signup
      const locationResult = await verifyUserLocation();
      if (!locationResult.allowed) {
        throw new Error(locationResult.error);
      }
      return await api.auth.register(userData);
    },
    onSuccess: () => {
      toast({
        title: 'Account created!',
        description: 'Your account has been successfully created. Please verify mail to login.',
      });
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
    if (dob) validateField('dob', dob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, username, email, password, tosAccepted, isOlder, dob]);

  const validateForm = () => {
    setHasSubmitted(true);
    try {
      signupSchema.parse({ username, email, password, dob, tosAccepted, isOlder });
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
        toast({
          variant: 'destructive',
          title: 'Error uploading profile picture',
          description: getMessage(error) || 'Failed to upload profile picture. Please try again.',
        });
        setIsUploading(false);
      }
    }

    // Format dob as YYYY-MM-DD string for payload
    const dobFormatted = dob ? formatDateForAPI(dob) : undefined;

    signupMutation.mutate({
      username,
      email,
      password,
      dob: dobFormatted,
      tosAccepted,
      isOlder,
      profileImageUrl: profileImageUrl || undefined,
      lastKnownIp: locationResult?.ip_address,
      redirect: redirectParam || undefined,
    });
  };

  const handleGoogleLogin = async () => {
    // Don't proceed if location is restricted
    if (locationResult && !locationResult.allowed) {
      toast({
        variant: 'destructive',
        title: 'Location Restricted',
        description: locationResult.error,
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

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date for display
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Debounced date selection handler to prevent double-click issues
  const handleDateSelect = useCallback((date: Date | undefined) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Prevent rapid successive clicks (less than 300ms apart)
    if (timeSinceLastClick < 300) {
      return;
    }
    
    lastClickTimeRef.current = now;
    
    if (date) {
      // Add a small delay to ensure proper processing
      setTimeout(() => {
        setDob(date);
        form.setValue('dob', date, { shouldValidate: true });
        setIsDatePickerOpen(false);
      }, 50);
    }
  }, [form]);

  // Debounced click handler for opening the date picker
  const handleInputClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Prevent rapid successive clicks (less than 300ms apart)
    if (timeSinceLastClick < 300) {
      return;
    }
    
    lastClickTimeRef.current = now;
    setIsDatePickerOpen(true);
  }, []);

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
            <Link to="/">
              <img src="/icons/logo.svg" alt="StreamBet Logo" className="mb-4" />
            </Link>
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
                        disabled={isCheckingLocation || (locationResult && !locationResult.allowed)}
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
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.email ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0`}
                      disabled={
                        isCheckingLocation ||
                        isGoogleLogin ||
                        (locationResult && !locationResult.allowed)
                      }
                    />
                    {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      placeholder="Enter your password"
                      onChange={e => setPassword(e.target.value)}
                      className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) ${errors.password ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0`}
                      disabled={isCheckingLocation || (locationResult && !locationResult.allowed)}
                    />
                    {errors.password && (
                      <p className="text-destructive text-sm">{errors.password}</p>
                    )}
                    <p className="text-muted-foreground text-sm">
                      Password must be at least 8 characters and include uppercase, lowercase,
                      number, and special character.
                    </p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                          <Input
                            id="dob"
                            type="text"
                            value={dob ? formatDateForDisplay(dob) : ''}
                            placeholder="Select your date of birth"
                            readOnly
                            className={`bg-[#272727]/80 text-white placeholder:rgba(255, 255, 255, 1) pl-10 ${errors.dob ? 'border-destructive' : ''} border-0 focus:border-0 focus:ring-0`}
                            disabled={isCheckingLocation || (locationResult && !locationResult.allowed)}
                            onClick={handleInputClick}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 select-none" align="start">
                        <Calendar
                          key="dob-calendar"
                          mode="single"
                          selected={dob}
                          month={currentMonth}
                          onMonthChange={setCurrentMonth}
                          onSelect={handleDateSelect}
                          captionLayout="dropdown"
                          toDate={new Date()}
                          components={{
                            CaptionLabel: () => null,
                            Dropdown: ({ children, value, onChange, className = '', style, ...rest }) => (
                              <select
                                value={value}
                                onChange={onChange}
                                className={`bg-black text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary border border-gray-700 ${className}`}
                                style={{ minWidth: 80, ...style }}
                                {...rest}
                              >
                                {children}
                              </select>
                            ),
                          }}
                          classNames={{
                            caption_dropdowns: 'flex gap-[5px] justify-center',
                            day: 'h-9 w-9 p-0 font-light aria-selected:opacity-100',
                            day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                            day_today: 'bg-accent text-accent-foreground',
                            day_outside: 'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
                            day_disabled: 'text-muted-foreground opacity-50',
                            day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                            day_hidden: 'select-none',
                          }}
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.dob && <p className="text-destructive text-sm">{errors.dob}</p>}
                  </motion.div>
                  <motion.div variants={itemVariants} className="flex items-center space-x-2">
                    <Checkbox
                      id="tosAccepted"
                      checked={tosAccepted}
                      onCheckedChange={checked => setTosAccepted(checked as boolean)}
                      disabled={isCheckingLocation || (locationResult && !locationResult.allowed)}
                    />
                    <Label htmlFor="tosAccepted" className="text-sm pt-2 pb-2">
                      I accept the{' '}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline">
                        Terms of Use
                      </Link>
                      {', '}
                      <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      {', and Sweestakes Rules.'}
                    </Label>
                    {errors.tosAccepted && (
                      <p className="text-destructive text-sm">{errors.tosAccepted}</p>
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants} className="flex items-center space-x-2 w-full pb-2">
                    <Checkbox
                      id="isOlder"
                      checked={isOlder}
                      onCheckedChange={checked => setIsOlder(checked as boolean)}
                      disabled={isCheckingLocation || (locationResult && !locationResult.allowed)}
                    />
                    <Label htmlFor="isOlder" className="text-sm">
                      I confirm that I am 18 years of age or older
                    </Label>
                    {errors.isOlder && <p className="text-destructive text-sm">{errors.isOlder}</p>}
                  </motion.div>
                  {/* Sign Up button */}
                  <div className="relative">
                    <motion.div variants={itemVariants}>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={
                          signupMutation.isPending ||
                          isUploading ||
                          isCheckingLocation ||
                          (locationResult && !locationResult.allowed)
                        }
                      >
                        {isCheckingLocation
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
                      disabled={
                        googleLoginMutation.isPending ||
                        isCheckingLocation ||
                        (locationResult && !locationResult.allowed)
                      }
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
                </form>
              </FormProvider>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <motion.div variants={itemVariants} className="text-center w-full inline-flex flex-row justify-center items-center">
                <p className="text-sm font-sm text-[rgba(255, 255, 255, 0.8)] opacity-70 drop-shadow-md mt-6">
                  Already have an account?{' '}
               
                </p>
                <Link to={redirectParam ? `/login?redirect=${redirectParam}` : "/login"} className="text-sm text-primary hover:underline font-md drop-shadow-md mt-6 ml-2">
                    Log in
                  </Link>
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
