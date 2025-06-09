import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface BettingOptionsSectionProps {
  streamId: string;
  bettingOptions: string[];
  onUpdate: () => void;
}

export const BettingOptionsSection = ({
  streamId,
  bettingOptions,
  onUpdate,
}: BettingOptionsSectionProps) => {
  const { toast } = useToast();
  const [options, setOptions] = useState<string[]>(bettingOptions || []);

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSaveOptions = async () => {
    // Filter out empty options
    const validOptions = options.filter(option => option.trim() !== '');

    const { error } = await supabase
      .from('streams')
      .update({ betting_options: validOptions })
      .eq('id', streamId);

    if (error) {
      toast({
        title: 'Error updating betting options',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Betting options updated successfully',
    });

    onUpdate();
  };

  return (
    <div className="pt-6 border-t">
      <h4 className="text-lg font-semibold mb-4">Betting Options</h4>
      <div className="space-y-4">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Enter betting option (e.g., 'Green Marble')"
              value={option}
              onChange={e => updateOption(index, e.target.value)}
            />
            <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={addOption}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Betting Option
        </Button>
        <Button onClick={handleSaveOptions} className="w-full">
          Save Betting Options
        </Button>
      </div>
    </div>
  );
};
