import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useDebounce } from '@/lib/utils';
import api from '@/integrations/api/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { getMessage } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Withdrawer, WithdrawerError } from '@/types/withdraw';
import { useToast } from '@/hooks/use-toast';
import Withdraw from './Withdraw';
import { MainLayout } from '../layout';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../ui/skeleton';
// import PersonaKYC from './PersonaKYC';

export default function Redeem() {
  const [sweepCoins, setSweepCoins] = useState('');
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [withdrawerInfo, setWithdrawer] = useState<Withdrawer | null>(null);
  const [loading, setLoading] = useState(false);
  const [height, setHeight] = useState<string>('500');
  // const [sessionKey, setSessionKey] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuthContext();
  const [withdrawingState, setWithdrawingState] = useState<"addingBank" | "payout" | "generatingTokens" | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [resumeVerification, setResumeVerification] = useState(false);
  const [sessionKey, setSessionKey] = useState<string>('')
  const { toast } = useToast();
  const navigate = useNavigate();

  const sweepBalance = session?.walletBalanceSweepCoin || 0;
  const apiUrl = import.meta.env.VITE_COINFLOW_API_URL || 'https://sandbox.coinflow.cash';
  const merchantId = import.meta.env.VITE_COINFLOW_MERCHANT_ID || 'streambet';

  // Debounced API call
  const debouncedRedeem = useDebounce(async (value: string) => {
    setError(null);
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      setUsdValue(null);
      setError('Please enter a valid amount');
      return;
    } else if (num > sweepBalance) {
      setUsdValue(null);
      setError(`You only have ${sweepBalance} sweep coins`);
      return;
    }
    setLoading(true);
    try {
      const res = await api.wallet.getRedeemableAmount(num);
      setUsdValue(res?.data?.dollars);
    } catch (error: unknown) {
      setError(getMessage(error || 'Failed to fetch USD value'));
      setUsdValue(null);
    }
    setLoading(false);
  }, 700);

  const resumeVerificationDebounce = useDebounce(async (link: string) => {
    window.location.href = link;
  }, 3000);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSweepCoins(e.target.value);
    debouncedRedeem(e.target.value);
  };

  const {
    data: withdrawerData,
    isFetching: isWithdrawerDataLoading,
    refetch: getWithdrawerData,
    error: withdrawerDataError,
  } = useQuery<Withdrawer, WithdrawerError>({
    queryKey: ['withdrawerData'],
    queryFn: async () => {
      try {
        const response = await api.payment.getWithdrawerData();
        return response?.data;
      } catch (err) {
        throw err;
      }
    },
  });

  useEffect(() => {
    if (withdrawerDataError && withdrawerDataError.status) {
      if (withdrawerDataError.status === 401) {
        // User is not registered yet as withdrawer
        navigate("/withdraw/verification", { replace: true });
        return;
      }

      if (withdrawerDataError.status === 451 && withdrawerDataError.response?.data?.verificationLink) {
        setResumeVerification(true);
        resumeVerificationDebounce(withdrawerDataError.response.data.verificationLink);
        return;
      }

      setWithdrawing(false);
      return;
    }

    if (withdrawerData?.withdrawer) {
      setWithdrawer(withdrawerData);
      const currentUrl = new URL(window.location.href);
      currentUrl.search = ''; 
      window.history.replaceState({}, document.title, currentUrl.toString());
    }
  }, [withdrawerData, withdrawerDataError]);

  const generateTokens = useCallback(async () => {
    if (withdrawingState === "generatingTokens") return;

    if (!session?.email || !session?.id) {
      toast({
          title: 'Error',
          description: 'User session not found. Please log in again.',
          variant: 'destructive',
      });
      return;
    }

    setWithdrawingState("generatingTokens");
    try {
      const sessionKeyResult = await api.payment.getSessionKey();
      
      setSessionKey(sessionKeyResult?.key)
    } catch (error: unknown) {
      toast({
        title: 'Error generating session key',
        description: getMessage(error),
        variant: 'destructive',
      });
    } finally {
      setWithdrawingState(null);
    }
  }, [session?.email, session?.id, toast]);

  const handleIframeMessages = useCallback(({ data, origin }: { data: string; origin: string }) => {
    if (!origin.includes('coinflow.cash')) return;

    try {
      const message = JSON.parse(data);

      console.log(message);
      if (message?.data === 'accountLinked') {
        getWithdrawerData();
        setWithdrawingState("payout");
      }
      if (message.method !== 'heightChange') return;
      setHeight(message.data);
    } catch (e: unknown) {
      // Ignore non-JSON messages from iframe
    }
  }, []);


  useEffect(() => {
    if (!window) throw new Error('Window not defined');
    window.addEventListener('message', handleIframeMessages);
    return () => {
        window.removeEventListener('message', handleIframeMessages);
    };
  }, [handleIframeMessages]);

  useEffect(() => {
    if (sessionKey && withdrawing) {
      setWithdrawingState("addingBank")
    }
  }, [sessionKey, withdrawing]);
  
  
  // useEffect(() => {
  //   if (!isWithdrawerDataLoading && withdrawerInfo?.withdrawer) {
  //     if (!sweepCoins || !usdValue) return;
  //     // If KYC not approved or no bank accounts, open iframe to link account
  //     if (withdrawerInfo.withdrawer.verification.status !== KycType.APPROVED
  //         || !withdrawerInfo.withdrawer.bankAccounts.length) {
  //         setProceedPayout(false);
  //         generateTokens();
  //     } else {
  //         setSessionKey('');
  //         setProceedPayout(true);
  //     }
  //   }
  // }, [isWithdrawerDataLoading, withdrawerInfo, sweepCoins, usdValue, generateTokens]);

  console.log(sessionKey)

  if (withdrawing && !!withdrawerInfo) {
    return <MainLayout isWithdraw>
      {withdrawingState === "generatingTokens" && 
        <div className="flex justify-center items-center min-h-[60vh] px-2">
          <Card className="w-full max-w-sm mx-auto shadow-lg p-4">
            <CardDescription className='text-center'>
              Loading Bank Selection
            </CardDescription>
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mt-4" />
          </Card>
        </div>
      }
      {withdrawingState === "addingBank" && 
        <div className='overflow-hidden mx-auto'>
          <iframe className='w-full h-[80dvh]' src={`${apiUrl}/solana/withdraw/${merchantId}?sessionKey=${sessionKey}`} scrolling='no' />
        </div>
      }
      {withdrawingState === "payout" && 
        <Withdraw 
          sweepCoins={Number(sweepCoins)} 
          amountToWithdraw={usdValue || 0}
          bankAccounts={withdrawerInfo?.withdrawer?.bankAccounts || []}
          setWithdrawer={setWithdrawer}
          onAddBank={generateTokens}
          onRefresh={getWithdrawerData}
          refetching={isWithdrawerDataLoading}
          onBack={() => {
            setWithdrawing(false);
            setWithdrawingState(null);
          }}
        />
      }
    </MainLayout>
  }

  return <MainLayout isWithdraw>
    <div className="flex justify-center items-center min-h-[60vh] px-2">
      <Card className="w-full max-w-sm mx-auto shadow-lg">
        {isWithdrawerDataLoading ?
          <CardContent className="flex flex-col pt-4 gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 mt-5" />
            <Skeleton className="h-2" />
          </CardContent> :
          resumeVerification ? 
            <CardHeader>
              <CardTitle>Redeem Verification</CardTitle>
              <CardDescription className='mx-auto pt-4'>
                Resuming your identity verification...
              </CardDescription>
              <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mt-4" />
            </CardHeader> :
            <>
              <CardHeader>
                <CardTitle>Redeem Sweep Coins</CardTitle>
                <CardDescription>
                  Enter the amount of sweep coins to redeem.
                  <div className='mt-4'>
                    Your sweep coin balance: {sweepBalance?.toLocaleString('en-US')}<br />
                    {session?.sweepCoinsPerDollar} sweep coins = $1
                    <div className="flex justify-between">
                      <span>Min: {Number(session?.minWithdrawableSweepCoins || 0)?.toLocaleString('en-US')} coins</span>
                      <span>Max: {Number((session?.maxWithdrawableSweepCoins ?? session?.walletBalanceSweepCoin) || 0)?.toLocaleString('en-US')}  coins</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="sweepCoins">Sweep Coins</Label>
                    <Input
                      id="sweepCoins"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="Enter amount"
                      value={sweepCoins}
                      onChange={handleChange}
                      className="mt-2"
                      autoComplete="off"
                    />
                  </div>
                  {loading && (
                    <div className="text-center text-muted-foreground text-sm">Calculating...</div>
                  )}
                  {error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {usdValue !== null && !error && !loading && (
                    <Alert className="mt-2">
                      <AlertTitle>Redeem Value</AlertTitle>
                      <AlertDescription>
                        You will get <span className="font-bold">${usdValue.toFixed(2)}</span> USD
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  disabled={!sweepCoins || !!error || !usdValue || isWithdrawerDataLoading}
                  className="w-full"
                  onClick={() => {
                    setWithdrawing(true);
                    setWithdrawingState("payout");
                  }}
                >
                  Redeem
                </Button>
              </CardFooter>
            </>
        }
      </Card>
    </div>
  </MainLayout>
}
