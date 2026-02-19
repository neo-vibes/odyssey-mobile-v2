/**
 * Solana RPC Service
 * Handles all Solana blockchain interactions using @solana/web3.js
 * Default network: devnet
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Commitment,
  SendOptions,
  TransactionSignature,
  TransactionConfirmationStatus,
  clusterApiUrl,
  ParsedAccountData,
} from '@solana/web3.js';
import type { TokenBalance } from '../types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CLUSTER = 'devnet';
const DEFAULT_COMMITMENT: Commitment = 'confirmed';

// Token program ID for SPL tokens
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// ============================================================================
// Connection Management
// ============================================================================

let connectionInstance: Connection | null = null;
let currentEndpoint: string | null = null;

/**
 * Get or create a singleton Connection to Solana RPC
 * @param endpoint - Optional custom RPC endpoint (defaults to devnet)
 * @returns Solana Connection instance
 */
export function getConnection(endpoint?: string): Connection {
  const targetEndpoint = endpoint ?? clusterApiUrl(DEFAULT_CLUSTER);

  // Return existing connection if endpoint matches
  if (connectionInstance && currentEndpoint === targetEndpoint) {
    return connectionInstance;
  }

  // Create new connection
  connectionInstance = new Connection(targetEndpoint, {
    commitment: DEFAULT_COMMITMENT,
  });
  currentEndpoint = targetEndpoint;

  return connectionInstance;
}

/**
 * Reset the connection (useful for testing or switching networks)
 */
export function resetConnection(): void {
  connectionInstance = null;
  currentEndpoint = null;
}

// ============================================================================
// Balance Functions
// ============================================================================

/**
 * Get SOL balance for a wallet address
 * @param publicKey - Wallet public key (string or PublicKey)
 * @returns Balance in lamports
 */
export async function getSolBalance(publicKey: string | PublicKey): Promise<number> {
  const connection = getConnection();
  const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;

  const balance = await connection.getBalance(pubkey);
  return balance;
}

/**
 * Token account info structure from parsed account data
 */
interface TokenAccountInfo {
  mint: string;
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
  };
}

/**
 * Get all token balances for a wallet (SOL + SPL tokens)
 * @param publicKey - Wallet public key (string or PublicKey)
 * @returns Array of token balances including native SOL
 */
export async function getTokenBalances(publicKey: string | PublicKey): Promise<TokenBalance[]> {
  const connection = getConnection();
  const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;

  const balances: TokenBalance[] = [];

  // Get native SOL balance
  const solBalance = await connection.getBalance(pubkey);
  balances.push({
    mint: 'native',
    amount: solBalance,
    decimals: 9,
    symbol: 'SOL',
    uiAmount: solBalance / LAMPORTS_PER_SOL,
    logoUri: null, // Could add SOL logo URI if needed
  });

  // Get SPL token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  });

  for (const { account } of tokenAccounts.value) {
    const parsedData = account.data as ParsedAccountData;
    const info = parsedData.parsed?.info as TokenAccountInfo | undefined;

    if (info) {
      balances.push({
        mint: info.mint,
        amount: Number(info.tokenAmount.amount),
        decimals: info.tokenAmount.decimals,
        symbol: null, // Token metadata would require additional lookup
        uiAmount: info.tokenAmount.uiAmount,
        logoUri: null,
      });
    }
  }

  return balances;
}

// ============================================================================
// Transaction Building
// ============================================================================

/**
 * Build a SOL transfer transaction
 * @param from - Sender public key
 * @param to - Recipient public key
 * @param amount - Amount in lamports
 * @returns Unsigned Transaction
 */
export async function buildTransferSolTransaction(
  from: string | PublicKey,
  to: string | PublicKey,
  amount: number
): Promise<Transaction> {
  const fromPubkey = typeof from === 'string' ? new PublicKey(from) : from;
  const toPubkey = typeof to === 'string' ? new PublicKey(to) : to;

  // Validate amount
  if (amount <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

  // Build transaction
  const transaction = new Transaction({
    feePayer: fromPubkey,
    blockhash,
    lastValidBlockHeight,
  });

  // Add transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: amount,
    })
  );

  return transaction;
}

// ============================================================================
// Blockhash Functions
// ============================================================================

/**
 * Get recent blockhash for transaction building
 * @returns Blockhash and last valid block height
 */
export async function getRecentBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = getConnection();
  const latestBlockhash = await connection.getLatestBlockhash(DEFAULT_COMMITMENT);

  return {
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  };
}

// ============================================================================
// Transaction Sending
// ============================================================================

/**
 * Send a signed transaction to the network
 * @param transaction - Signed transaction (Transaction object, Uint8Array, or base64 string)
 * @param options - Optional send options
 * @returns Transaction signature
 */
export async function sendTransaction(
  transaction: Transaction | Uint8Array | string,
  options?: SendOptions
): Promise<TransactionSignature> {
  const connection = getConnection();

  // Handle different input formats
  let serializedTx: Uint8Array;

  if (transaction instanceof Transaction) {
    // Transaction must already be signed
    serializedTx = transaction.serialize();
  } else if (typeof transaction === 'string') {
    // Assume base64 encoded - decode to Uint8Array
    serializedTx = base64ToUint8Array(transaction);
  } else {
    serializedTx = transaction;
  }

  const signature = await connection.sendRawTransaction(serializedTx, {
    skipPreflight: false,
    preflightCommitment: DEFAULT_COMMITMENT,
    ...options,
  });

  return signature;
}

// ============================================================================
// Transaction Confirmation
// ============================================================================

/**
 * Confirm a transaction
 * @param signature - Transaction signature to confirm
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns Confirmation status and error if any
 */
export async function confirmTransaction(
  signature: TransactionSignature,
  timeout = 30000
): Promise<{
  confirmed: boolean;
  status: TransactionConfirmationStatus | null;
  error: string | null;
}> {
  const connection = getConnection();

  // Get the blockhash for confirmation
  const { lastValidBlockHeight } = await connection.getLatestBlockhash();

  const startTime = Date.now();

  // Poll for confirmation
  while (Date.now() - startTime < timeout) {
    const status = await connection.getSignatureStatus(signature);

    if (status.value !== null) {
      // Check for error
      if (status.value.err) {
        return {
          confirmed: false,
          status: status.value.confirmationStatus ?? null,
          error: JSON.stringify(status.value.err),
        };
      }

      // Check confirmation level
      if (
        status.value.confirmationStatus === 'confirmed' ||
        status.value.confirmationStatus === 'finalized'
      ) {
        return {
          confirmed: true,
          status: status.value.confirmationStatus,
          error: null,
        };
      }
    }

    // Check if blockhash is still valid
    const currentBlockHeight = await connection.getBlockHeight();
    if (currentBlockHeight > lastValidBlockHeight) {
      return {
        confirmed: false,
        status: null,
        error: 'Transaction expired (blockhash no longer valid)',
      };
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    confirmed: false,
    status: null,
    error: `Transaction confirmation timeout after ${timeout}ms`,
  };
}

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Validate if a string is a valid Solana address
 * @param address - Address string to validate
 * @returns True if valid Solana address
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Check length (Solana addresses are 32-44 characters base58)
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  try {
    // Try to create a PublicKey - this validates base58 encoding
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shorten a Solana address for display
 * @param address - Full address string
 * @param chars - Number of characters to show on each side (default: 4)
 * @returns Shortened address (e.g., "7Np4...Kz9m")
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) {
    return '';
  }

  if (address.length <= chars * 2 + 3) {
    return address;
  }

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// ============================================================================
// Base64 Utilities (React Native compatible)
// ============================================================================

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decode base64 string to Uint8Array (React Native compatible)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove padding
  const cleanBase64 = base64.replace(/=+$/, '');
  const length = cleanBase64.length;

  // Calculate output length
  const outputLength = Math.floor((length * 3) / 4);
  const bytes = new Uint8Array(outputLength);

  let byteIndex = 0;
  for (let i = 0; i < length; i += 4) {
    const a = BASE64_CHARS.indexOf(cleanBase64[i]);
    const b = i + 1 < length ? BASE64_CHARS.indexOf(cleanBase64[i + 1]) : 0;
    const c = i + 2 < length ? BASE64_CHARS.indexOf(cleanBase64[i + 2]) : 0;
    const d = i + 3 < length ? BASE64_CHARS.indexOf(cleanBase64[i + 3]) : 0;

    bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (byteIndex < outputLength) bytes[byteIndex++] = ((b & 15) << 4) | (c >> 2);
    if (byteIndex < outputLength) bytes[byteIndex++] = ((c & 3) << 6) | d;
  }

  return bytes;
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/**
 * Format SOL amount for display
 */
export function formatSol(lamports: number, decimals = 4): string {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(decimals);
}
