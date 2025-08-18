import { COINFLOW_CONFIG } from '@/config/coinflow';

export interface CoinflowCheckoutParams {
  webhookInfo: Record<string, any>;
  subtotal: {
    currency: string;
    cents: number;
  };
  email: string;
  blockchain: string;
  chargebackProtectionData: Array<{
    productType: string;
    rawProductData: Record<string, any>;
    productName: string;
    quantity: number;
  }>;
  settlementType: string;
}

export interface CoinflowSessionParams {
  customerId: string;
  merchantId: string;
}

export class CoinflowService {
  private static readonly API_BASE = COINFLOW_CONFIG.API_BASE_URL;
  private static readonly MERCHANT_ID = COINFLOW_CONFIG.MERCHANT_ID;

  /**
   * Generate a JWT token for Coinflow checkout
   * This should be called from your backend to secure the checkout parameters
   */
  static async generateCheckoutJWT(params: CoinflowCheckoutParams): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE}/api/checkout/jwt-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_COINFLOW_API_KEY}`, // Your API key
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate JWT: ${response.statusText}`);
      }

      const data = await response.json();
      return data.checkoutJwtToken;
    } catch (error) {
      console.error('Error generating checkout JWT:', error);
      throw error;
    }
  }

  /**
   * Generate a session key for Coinflow
   * This should be called from your backend
   */
  static async generateSessionKey(params: CoinflowSessionParams): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE}/api/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_COINFLOW_API_KEY}`, // Your API key
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate session key: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sessionKey;
    } catch (error) {
      console.error('Error generating session key:', error);
      throw error;
    }
  }

  /**
   * Prepare checkout parameters for JWT generation
   */
  static prepareCheckoutParams(
    amount: number,
    email: string,
    userId: string,
    itemName: string = "StreamBet Coins"
  ): CoinflowCheckoutParams {
    return {
      webhookInfo: {
        itemName,
        price: amount.toString(),
        amount,
        userId,
        timestamp: new Date().toISOString(),
      },
      subtotal: {
        currency: "USD",
        cents: Math.floor(amount * 100),
      },
      email,
      blockchain: "solana",
      chargebackProtectionData: [
        {
          productType: "inGameProduct",
          rawProductData: {
            productID: `coins-${Date.now()}`,
            productDescription: `Purchase of ${amount} ${itemName}`,
            productCategory: "Gaming Currency",
            amount,
            userId,
            timestamp: new Date().toISOString(),
          },
          productName: itemName,
          quantity: 1,
        },
      ],
      settlementType: "USDC",
    };
  }

  /**
   * Prepare session parameters
   */
  static prepareSessionParams(customerId: string): CoinflowSessionParams {
    return {
      customerId,
      merchantId: this.MERCHANT_ID,
    };
  }
}
