import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { AmountInput } from '@/components/deposit/AmountInput';
import { PayPalButtonsWrapper } from '@/components/deposit/PayPalButtons';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import BuyCoins from '@/components/deposit/BuyCoins';




const Purchase = () => {


  return (
  <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container max-w-2xl pt-24 pb-8">
        <div className="space-y-6">
          <BuyCoins />
        </div>
      </main>
    </div>
  )
}

export default Purchase;
