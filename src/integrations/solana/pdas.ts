import { PublicKey } from '@solana/web3.js';

export const MARKETPLACE_SEED = Buffer.from('marketplace');
export const SELLER_PROFILE_SEED = Buffer.from('seller_profile');
export const SELLER_GROUP_SEED = Buffer.from('seller_group');
export const BUYER_WAIVER_SEED = Buffer.from('buyer_waiver');
export const CRYPTO_SELLER_SEED = Buffer.from('crypto_seller');
export const INVOICE_SEED = Buffer.from('invoice');
export const DEFAULT_SELLER_GROUP_ID = 0;
export const INVOICE_ID_LEN = 16;

export function marketplacePda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([MARKETPLACE_SEED], programId);
}
export function sellerProfilePda(programId: PublicKey, seller: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SELLER_PROFILE_SEED, seller.toBuffer()], programId);
}
export function sellerGroupPda(programId: PublicKey, groupId: number): [PublicKey, number] {
  const idBuf = Buffer.alloc(2);
  idBuf.writeUInt16LE(groupId, 0);
  return PublicKey.findProgramAddressSync([SELLER_GROUP_SEED, idBuf], programId);
}
export function buyerWaiverPda(programId: PublicKey, buyer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([BUYER_WAIVER_SEED, buyer.toBuffer()], programId);
}
export function cryptoSellerAllowancePda(
  programId: PublicKey,
  seller: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CRYPTO_SELLER_SEED, seller.toBuffer()], programId);
}
export function invoicePda(
  programId: PublicKey,
  invoiceId: Uint8Array | Buffer
): [PublicKey, number] {
  if (invoiceId.length !== INVOICE_ID_LEN) {
    throw new Error(`invoiceId must be ${INVOICE_ID_LEN} bytes`);
  }
  return PublicKey.findProgramAddressSync([INVOICE_SEED, Buffer.from(invoiceId)], programId);
}
