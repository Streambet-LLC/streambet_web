import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import KYCEmailCountry, { EmailCountryForm } from "./KYCEmailCountry";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "../ui/skeleton";
import { MainLayout } from "../layout";
import { useEffect, useState } from "react";
import KYCUSForm, { USForm } from "./KycUS";
import api from "@/integrations/api/client";
import { useNavigate } from "react-router-dom";
import { getMessage } from "@/utils/helper";
import { useToast } from "@/hooks/use-toast";
import Persona from 'persona';
import { useQuery } from "@tanstack/react-query";
import { Withdrawer, WithdrawerError } from "@/types/withdraw";
import { useDebounce } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Kyc() {
  const [step, setStep] = useState<'emailCountryForm' | 'usForm'>(); 
  const [emailCountry, setEmailCountry] = useState<EmailCountryForm | null>();
  const [resumeVerification, setResumeVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const auth = useAuthContext();
  const { toast } = useToast();

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

  const handleSubmitEmailCountry = async (emailCountry: EmailCountryForm) => {
    if (emailCountry.country === "US") {
      setEmailCountry(emailCountry);
      setStep("usForm");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await api.payment.registerKyc(emailCountry);

      navigate("/withdraw");
    } catch (error) {
      if (error.status === 451 && error.response?.data?.verificationLink) {
        window.location.href = error.response.data.verificationLink;
        return;
      }

      console.error(error);
      toast({
        title: 'Error verifying user',
        description: getMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitUSForm = async (usForm: USForm) => {
    try {
      setIsSubmitting(true);

      const res = await api.payment.registerKycUs({
        ...emailCountry,
        ...usForm,
        dob: format(usForm.dob, "yyyyMMdd"),
      });

      navigate("/withdraw");
    } catch (error) {
      if (error.status === 451 && error.response?.data?.verificationLink) {
        window.location.href = error.response.data.verificationLink;
        return;
      }

      console.error(error);
      toast({
        title: 'Error verifying user',
        description: getMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resumeVerificationDebounce = useDebounce(async (link: string) => {
    window.location.href = link;
  }, 3000);

  useEffect(() => {
    if (withdrawerDataError && withdrawerDataError.status) {
      if (withdrawerDataError.status === 401) {
        // User is not registered yet as withdrawer
        setStep("emailCountryForm");
        return;
      }

      if (withdrawerDataError.status === 451 && withdrawerDataError.response?.data?.verificationLink) {
        setResumeVerification(true);
        resumeVerificationDebounce(withdrawerDataError.response.data.verificationLink);
        return;
      }
    }

    if (withdrawerData?.withdrawer) {
      navigate("/withdraw", { replace: true });
    }
  }, [withdrawerData, withdrawerDataError]);

  return (
    <MainLayout isWithdraw>
      <div className="flex justify-center items-center min-h-[60vh] px-2">
        <Card className="w-full max-w-sm mx-auto shadow-lg">
          {auth.isFetching || isWithdrawerDataLoading ?
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
                  <CardTitle>Redeem Verification</CardTitle>
                  <CardDescription>
                      Before you can redeem sweep coins, we need to verify your identification.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {step === "emailCountryForm" && 
                    <KYCEmailCountry 
                      data={emailCountry || {
                        email: auth.session?.email,
                        country: "US",
                      }}
                      isSubmitting={isSubmitting}
                      onNext={handleSubmitEmailCountry} 
                    />
                  }
                  {step === "usForm" && 
                    <KYCUSForm  
                      isSubmitting={isSubmitting}
                      onBack={() => setStep("emailCountryForm")}
                      onNext={handleSubmitUSForm}
                    />
                  }
                </CardContent>
              </>
          }
        </Card>
      </div>
    </MainLayout>
  );
}