import { useState, useEffect } from "react";
import { WalletModalButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { CoinflowWithdraw } from "@coinflowlabs/react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

// This will likely be moved to a config file
function getMerchantId() {
  // Example placeholder merchant ID - replace with your actual merchant ID
  return "streambet"; // Or from your actual config
}

export const CoinFlowWithdrawComponent = ({ amount, isProcessing, onProcessingChange }) => {
  const [showCoinFlow, setShowCoinFlow] = useState(false);
  const wallet = useWallet();
  const connection = useConnection();
  const { session } = useAuthContext();
  const { toast } = useToast();

  // When "Withdraw with CoinFlow" is clicked
  const startWithdrawal = () => {
    setShowCoinFlow(true);
    if (!wallet.connected) {
      // Trigger Phantom connect if not already connected
      // The WalletModalProvider will handle showing the modal
      wallet.connect().catch(console.error);
    }
  };

  // If user just connected wallet, show Coinflow UI automatically
  useEffect(() => {
    if (wallet.connected && showCoinFlow) {
      onProcessingChange(true);
    }
  }, [wallet.connected, showCoinFlow, onProcessingChange]);

  const handleSuccess = (data: any) => { // Type data correctly
    onProcessingChange(false);
    setShowCoinFlow(false);
    toast({
      title: 'Withdrawal Successful!',
      description: `Your withdrawal of $${amount} has been processed.`,
    });
    // Invalidate queries or update state as needed
  };

  return (
    <div className="space-y-4">
      {!showCoinFlow && (
        <button
          onClick={startWithdrawal}
          disabled={!amount || Number(amount) <= 0 || isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" // Use your actual button styles
        >
          Withdraw with CoinFlow
        </button>
      )}

      {showCoinFlow && (
        <div className="w-full" style={{ height: "950px" }}>
          {!wallet.connected && (
            <div className="text-center space-y-2">
              <WalletModalButton />
              <p className="mt-2 text-sm text-gray-500">
                Connect your wallet to proceed with withdrawal.
              </p>
            </div>
          )}

          {wallet.connected && (
            <CoinflowWithdraw
              env="sandbox"
              blockchain="solana"
              // lockAmount
              connection={connection.connection} // Use connection.connection to get the actual Connection object
              email={session?.email || ""}
              onSuccess={handleSuccess}
              merchantId={getMerchantId()}
              transactionSigner="BxrstB2XcoeubuBk8K5eiYjAdNrk5YDdbrbm74uNinAm"
              wallet={{
                publicKey: wallet.publicKey,
                signTransaction: wallet.signTransaction,
                sendTransaction: (transaction: any) =>
                  wallet.sendTransaction(
                    transaction,
                    connection.connection
                  ),
              }}
              amount={Number(amount)}
            />
          )}
        </div>
      )}
    </div>
  );
} 