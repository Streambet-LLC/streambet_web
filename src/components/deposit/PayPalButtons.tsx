import { PayPalButtons } from '@paypal/react-paypal-js';
import { useToast } from '@/components/ui/use-toast';

interface PayPalButtonsProps {
  amount: string;
  isProcessing: boolean;
  onCreateOrder: () => Promise<string>;
  onCaptureOrder: (orderId: string) => Promise<void>;
}

export const PayPalButtonsWrapper = ({
  amount,
  isProcessing,
  onCreateOrder,
  onCaptureOrder,
}: PayPalButtonsProps) => {
  const { toast } = useToast();
  const amountNum = Number(amount);

  if (isNaN(amountNum) || amountNum <= 0) {
    return null;
  }

  return (
    <>
      <PayPalButtons
        style={{
          layout: 'vertical',
          shape: 'rect',
          label: 'pay',
        }}
        fundingSource="paypal"
        disabled={isProcessing || !amount}
        createOrder={onCreateOrder}
        onApprove={async data => {
          await onCaptureOrder(data.orderID);
        }}
        onError={err => {
          console.error('PayPal error:', err);
          toast({
            title: 'Error',
            description: 'PayPal payment failed. Please try again.',
            variant: 'destructive',
          });
        }}
      />
      <PayPalButtons
        style={{
          layout: 'vertical',
          shape: 'rect',
          label: 'pay',
        }}
        fundingSource="card"
        disabled={isProcessing || !amount}
        createOrder={onCreateOrder}
        onApprove={async data => {
          await onCaptureOrder(data.orderID);
        }}
        onError={err => {
          console.error('PayPal error:', err);
          toast({
            title: 'Error',
            description: 'Card payment failed. Please try again.',
            variant: 'destructive',
          });
        }}
      />
    </>
  );
};
