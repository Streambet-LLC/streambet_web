import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAutoReload } from '@/hooks/useAutoReload';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AutoReloadSettings() {
  const { settings, saveSettings, hasPaymentMethod } = useAutoReload();
  const [localSettings, setLocalSettings] = useState({
    enabled: settings.enabled,
    amount: settings.amount,
    threshold: settings.threshold,
  });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const handleSaveSettings = () => {
    saveSettings(localSettings);
    setShowSaveSuccess(true);

    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  const presetAmounts = [5, 10, 15, 20, 50, 100];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw size={18} className="text-primary" />
          Auto-Reload Settings
        </CardTitle>
        <CardDescription>Automatically reload your wallet when your balance is low</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasPaymentMethod && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Method Required</AlertTitle>
            <AlertDescription>
              You need to add a payment method before enabling auto-reload.
            </AlertDescription>
          </Alert>
        )}

        {showSaveSuccess && (
          <Alert
            variant="default"
            className="mb-4 bg-green-500/10 text-green-500 border-green-500/20"
          >
            <AlertTitle>Settings Saved</AlertTitle>
            <AlertDescription>Your auto-reload settings have been updated.</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="auto-reload-toggle" className="font-medium">
            Enable Auto-Reload
          </Label>
          <Switch
            id="auto-reload-toggle"
            checked={localSettings.enabled}
            onCheckedChange={checked => setLocalSettings({ ...localSettings, enabled: checked })}
            disabled={!hasPaymentMethod}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reload-amount" className="font-medium">
            Reload Amount
          </Label>
          <div className="flex gap-2">
            <Select
              value={localSettings.amount.toString()}
              onValueChange={value =>
                setLocalSettings({ ...localSettings, amount: parseInt(value) })
              }
              disabled={!localSettings.enabled || !hasPaymentMethod}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select amount" />
              </SelectTrigger>
              <SelectContent>
                {presetAmounts.map(amount => (
                  <SelectItem key={amount} value={amount.toString()}>
                    ${amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Amount to add to your wallet when auto-reload is triggered
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="threshold-slider" className="font-medium">
            Balance Threshold: ${localSettings.threshold}
          </Label>
          <Slider
            id="threshold-slider"
            min={1}
            max={20}
            step={1}
            value={[localSettings.threshold]}
            onValueChange={value => setLocalSettings({ ...localSettings, threshold: value[0] })}
            disabled={!localSettings.enabled || !hasPaymentMethod}
            className="py-4"
          />
          <p className="text-sm text-muted-foreground">
            Auto-reload will trigger when your balance falls below this amount
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveSettings} disabled={!hasPaymentMethod} className="w-full">
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
