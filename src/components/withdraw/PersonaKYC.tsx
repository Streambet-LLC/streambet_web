import { useAuthContext } from '@/contexts/AuthContext';
import { kycAPI } from '@/integrations/api/client';
import { Withdrawer } from '@/types/withdraw';
import Persona from 'persona';

export default function PersonaKYC({
  onKycComplete
} : {
  onKycComplete: (withdrawer: Withdrawer) => void;
}) {
  const { session } = useAuthContext();

  const handleComplete = async ({ inquiryId }) => {
    try {
      const res = await kycAPI.registerKyc({ inquiryId });

      if (!res.withdrawer) {
        // TODO: handle this if withdrawer is missing
      }

      onKycComplete(res.withdrawer);
    } catch (error) {
      // If the KYC needs more verification
      if (error.response.data.statusCode === 451) {

      }
    } 
  };
  
  const client = new Persona.Client({
    // Should be placed on an env
    templateId: "itmpl_b2z2qoxi3oXwQWvrgk7DMms5jNKK",
    referenceId: session.id,
    environmentId: "env_Be7uwSSWrZCx4swnsDQqQCfMvXDj",
    onReady: () => client.open(),
    onComplete: handleComplete,
    onCancel: ({ inquiryId, sessionToken }) => console.log('onCancel'),
    onError: (error) => console.log(error),
  });

  return <></>;
}