import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { AnchorProvider, Program, BN, type Idl, type Wallet } from '@coral-xyz/anchor';
import idl from './cardcade_marketplace.json';
import {
  marketplacePda,
  sellerProfilePda,
  sellerGroupPda,
  buyerWaiverPda,
  cryptoSellerAllowancePda,
  invoicePda,
  DEFAULT_SELLER_GROUP_ID,
} from './pdas';

/**
 * Quote payload returned by the API's /crypto/quote endpoint. Mirrors
 * `CryptoPaymentQuote` on the server.
 */
export interface CryptoPaymentQuote {
  invoiceId: string;
  amount: string;
  shipping: string;
  buyerFeeBps: number;
  sellerFeeBps: number;
  buyerFee: string;
  sellerFee: string;
  totalBuyerPays: string;
  programId: string;
  paymentMint: string;
  sellerWallet: string;
  treasuryAta: string;
  marketplacePda: string;
  sellerProfilePda: string;
  sellerGroupPda: string;
  buyerWaiverPda: string;
  cryptoSellerAllowancePda: string;
  invoicePda: string;
  sellerIsAuthority: boolean;
  sellerOverridden: boolean;
}

/**
 * Minimal wallet shape we need from `useWallet()` to satisfy AnchorProvider.
 * The adapter wallet doesn't expose a Keypair, so we wrap the publicKey +
 * signing methods.
 */
export interface AdapterLikeWallet {
  publicKey: PublicKey | null;
  signTransaction?: <T extends Transaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends Transaction>(txs: T[]) => Promise<T[]>;
}

function getProgram(connection: Connection, wallet: AdapterLikeWallet): Program {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error('Wallet not connected');
  }
  const anchorWallet: Wallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction.bind(wallet),
    signAllTransactions: wallet.signAllTransactions.bind(wallet),
    payer: undefined as never,
  };
  const provider = new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
  });
  return new Program(idl as Idl, provider);
}

/**
 * Build (and optionally prepend an ATA-create) the pay_invoice transaction.
 * Returns an unsigned Transaction the caller can sign+send via wallet adapter.
 */
export async function buildPayInvoiceTx(
  connection: Connection,
  wallet: AdapterLikeWallet,
  quote: CryptoPaymentQuote
): Promise<Transaction> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  const program = getProgram(connection, wallet);
  const programId = new PublicKey(quote.programId);
  const paymentMint = new PublicKey(quote.paymentMint);
  const seller = new PublicKey(quote.sellerWallet);
  const buyer = wallet.publicKey;

  // Re-derive PDAs locally for safety (also confirms the server's values).
  const [marketplace] = marketplacePda(programId);
  const [profile] = sellerProfilePda(programId, seller);
  const [group] = sellerGroupPda(programId, DEFAULT_SELLER_GROUP_ID);
  const groupAddr = quote.sellerGroupPda ? new PublicKey(quote.sellerGroupPda) : group;
  const [waiver] = buyerWaiverPda(programId, buyer);
  const [allowance] = cryptoSellerAllowancePda(programId, seller);
  const invoiceIdBuf = Buffer.from(quote.invoiceId, 'hex');
  const [invoice] = invoicePda(programId, invoiceIdBuf);

  // Derive ATAs.
  const buyerAta = await getAssociatedTokenAddress(paymentMint, buyer);
  const sellerAta = await getAssociatedTokenAddress(paymentMint, seller);
  const treasuryAta = new PublicKey(quote.treasuryAta);

  // Pre-create seller ATA if missing (buyer pays the rent ~0.002 SOL).
  // Buyer ATA is assumed to exist (otherwise they have no USDC anyway).
  const tx = new Transaction();
  const sellerAtaInfo = await connection.getAccountInfo(sellerAta);
  if (!sellerAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(buyer, sellerAta, seller, paymentMint));
  }

  // Convert invoice id to number[] for Anchor [u8; 16] arg.
  const invoiceIdArr = Array.from(invoiceIdBuf);
  const amount = new BN(quote.amount);
  const shipping = new BN(quote.shipping);

  const ix = await program.methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .payInvoice(invoiceIdArr, amount, shipping)
    .accountsPartial({
      buyer,
      seller,
      marketplace,
      sellerProfile: profile,
      sellerGroup: groupAddr,
      buyerWaiver: waiver,
      cryptoSellerAllowance: allowance,
      invoice,
      paymentMint,
      buyerAta,
      sellerAta,
      treasuryAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  tx.add(ix);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = buyer;

  return tx;
}
