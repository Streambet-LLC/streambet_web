import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';
import Bugsnag from '@bugsnag/js';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await api.auth.forgotPassword(email, redirectParam || undefined);

      if (error) {
        throw error;
      }
      // const { error } = await api.auth.forgotPassword(email);
      // if (error) throw error;

      setSuccess(true);
    } catch (error: any) {
      Bugsnag.notify(error); 
      console.error('Password reset error:', error);
      setError(error || 'Failed to send password reset email. Please try again.');
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
            <Link to="/">
              <img src="/logo.svg" alt="StreamBet Logo" className="mb-8 w-[135px]" />
            </Link>
            <h1 className="text-3xl font-bold text-white text-left">Reset your password</h1>
            <p className="text-[#FFFFFFBF] mt-3 text-left font-light">
              Enter your email to receive a magic link
            </p>
          </div>

          <Card className="bg-transparent border-0 p-0">
            <CardContent className="p-0">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-4 bg-red-900/30 border-red-800 text-white"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{getMessage(error)}</AlertDescription>
                </Alert>
              )}

              {success ? (
                <Alert className="mb-4 bg-green-900/30 border-green-800 text-white">
                  <AlertDescription>
                    Password reset link sent! Check your email inbox for further instructions.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2 mb-2">
                    <Label htmlFor="email" className="text-white font-light">
                      Email or Username
                    </Label>
                    <Input
                      id="email"
                      placeholder="Enter your email or username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      required
                      className={`bg-[#272727]/80 border-none text-white placeholder:text-gray-400 ${!isFocused ? 'border-sidebar-border' : ''}`}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-black font-bold hover:bg-opacity-90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex justify-center border-t border-gray-800 pt-4">
              <Link to={redirectParam ? `/login?redirect=${redirectParam}` : "/login"} className="text-primary hover:underline flex items-center">
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

export default ForgotPassword;
