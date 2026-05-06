import { useState } from "react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { useMutation } from "@tanstack/react-query";
import api from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { getMessage } from "@/utils/helper";

export default function HideBetRoundOnLanding({
  betRoundId,
  hidden = false,
} : {
  betRoundId: string;
  hidden: boolean;
}) {
  const [hiddenOnLanding, setHiddenOnLanding] = useState(hidden);
  const { toast } = useToast();

  const updateRoundMutation = useMutation({
    mutationFn: (isHidden: boolean) => api.admin.updateBetRoundLandingPageVisibility(betRoundId, isHidden),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Pick round landing visibility updated' });
    },
    onError: (error: any, newState: boolean) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to update round',
        variant: 'destructive',
      });

      setHiddenOnLanding(!newState);
    },
  });

  const handleChange = (hidden: boolean) => {
    setHiddenOnLanding(hidden);

    updateRoundMutation.mutate(hidden);
  };

  return (
    <div className="flex w-full items-center p-2">
      <Checkbox
        checked={hiddenOnLanding}
        onCheckedChange={handleChange}
        className="appearance-none w-4 h-4 border-[1.5px] border-[#D0D5DD] rounded-sm bg-white checked:bg-white checked:border-[#D0D5DD] checked:before:content-['✔'] checked:before:text-black checked:before:text-[10px] checked:before:block checked:before:text-center mr-2"
      />
      <Label className="text-sm select-none font-medium text-white">
        Hidden on landing page
      </Label>
    </div>
  )
};