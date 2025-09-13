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
    templateId: "itmpl_haBD6sQRCDKzfxrJX32TTuuM5nej",
    referenceId: session.id,
    environmentId: "env_Be7uwSSWrZCx4swnsDQqQCfMvXDj",
    onReady: () => client.open(),
    onComplete: handleComplete,
    onCancel: ({ inquiryId, sessionToken }) => console.log('onCancel'),
    onError: (error) => console.log(error),
  });

  return <></>;
}