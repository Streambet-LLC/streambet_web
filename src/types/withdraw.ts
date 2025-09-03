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
        bankAccounts: [
            {
                alias: string;
                token: string;
                routingNumber: string;
                last4: string;
                accountHash: string;
                rtpEligible: boolean;
                reference: string;
                isDeleted: boolean;
            },
            {
                alias: string;
                token: string;
                routingNumber: string;
                last4: string;
                accountHash: string;
                rtpEligible: true,
                reference: string;
                isDeleted: boolean;
            }
        ],
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
}
