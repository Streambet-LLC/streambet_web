import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';

const passwordRequirements =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

function validatePassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Invalid or missing token.');
      return;
    }
    if (!validatePassword(password)) {
      setError(passwordRequirements);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
      toast({
      title: 'Password changed successfully!',
      description: `Please log in with your new password.`,
      });
      window.location.href = '/login'; // Redirect to login after success
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-bg-gradient" />
      <div className="flex min-h-screen justify-center pt-16 pb-8">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <img src="/logo.svg" alt="StreamBet Logo" className="mb-6 w-[121px]" />
            <h1 className="text-3xl font-bold text-white text-left">Set a new password</h1>
            <p className="text-[#FFFFFFBF] mt-3 text-left font-light">Enter your new password below.</p>
          </div>

          <Card className="bg-transparent border-0 p-0">
            <CardContent className="p-0">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-4 bg-red-900/30 border-red-800 text-white"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success ? (
                <Alert className="mb-4 bg-green-900/30 border-green-800 text-white">
                  <AlertDescription>
                    Password reset successful! You can now <Link to="/login" className="underline text-primary">log in</Link> with your new password.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-white">
                      New Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      required
                      className={`bg-[#272727]/80 border-none text-white placeholder:text-gray-400 ${!isFocused ? 'border-sidebar-border' : ''}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-white">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className={`bg-[#272727]/80 border-gray-700 text-white placeholder:text-gray-400`}
                    />
                  </div>
                  <div className="text-xs text-gray-400">{passwordRequirements}</div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-black font-bold hover:bg-opacity-90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t border-gray-800 pt-4">
              <Link to="/login" className="text-primary hover:underline flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </CardFooter>
          </Card>
        </div>
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
};

export default ResetPassword; 
