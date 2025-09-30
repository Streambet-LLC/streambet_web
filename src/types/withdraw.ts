export interface WithdrawPayload {
  coins: number,
  account: string,
  speed: "asap" | "same_day" | "standard",
};

export interface WithdrawerError {
    response: {
        data: {
            statusCode: number,
            timestamp: string,
            path: string,
            method: string,
            message: string,
        }
    }
};

export interface BankAccount {
    alias: string;
    token: string;
    routingNumber: string;
    last4: string;
    accountHash: string;
    rtpEligible: boolean;
    reference: string;
    isDeleted: boolean;
};

export interface Withdrawer {
    withdrawer: {
        _id: string;
        __v: number,
        availability: {
            status: string;
            reason: string;
            editor: string;
            updatedAt: string;
        },
        currency: string;
        email: string;
        merchant: string;
        originalCurrency: string;
        riskScoreOverride: boolean;
        user: boolean;
        verification: {
            hash: string;
            vendor: string;
            reference: string;
            status: string;
            attested: boolean;
        },
        wallets: [
            {
                wallet: string;
                blockchain: string;
            }
        ],
        watchlistExempt: string;
        bankAccounts: BankAccount[],
        cards: [
            {
                last4: string;
                type: string;
                disbursementStatus: string;
                token: string;
                createdAt: string;
            }
        ],
        ibans: [],
        pixes: [],
        efts: [],
        rtpDisabled: boolean;
        cardDisabled: boolean;
    }
};

export interface WithdrawComponentProps {
    sweepCoins: number,
	amountToWithdraw: number,
	bankAccounts: BankAccount[],
	setWithdrawer: (val: Withdrawer | undefined) => void,
};

interface SpeedOption {
  fee: { cents: number };
  finalSettlement: { cents: number };
  expectedDeliveryDate: string;
};
export interface WithdrawQuote {
  quote?: { cents: number };
  asap?: SpeedOption;
  same_day?: SpeedOption;
  standard?: SpeedOption;
};
