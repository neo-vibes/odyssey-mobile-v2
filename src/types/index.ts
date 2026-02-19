/**
 * Odyssey Mobile - TypeScript Types and Zod Schemas
 * Parse at boundaries: All API responses are validated with Zod
 */

import { z } from 'zod';

// ============================================================================
// Navigation Types (re-exported from navigation.ts)
// ============================================================================

export type {
  RootStackParamList,
  TabParamList,
  RootStackScreenProps,
  TabScreenProps,
} from './navigation';

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Spending limit for a session
 * mint: "native" for SOL, or SPL token mint address
 */
export const SpendingLimitSchema = z.object({
  mint: z.string(), // "native" for SOL or token mint pubkey
  amount: z.number().nonnegative(),
  decimals: z.number().int().nonnegative(),
  symbol: z.string().optional(),
});

export type SpendingLimit = z.infer<typeof SpendingLimitSchema>;

/**
 * Wallet - basic wallet info
 */
export const WalletSchema = z.object({
  publicKey: z.string(),
  createdAt: z.number(), // Unix timestamp in ms
  name: z.string(),
});

export type Wallet = z.infer<typeof WalletSchema>;

/**
 * StoredWallet - wallet with passkey credential
 */
export const StoredWalletSchema = WalletSchema.extend({
  credentialId: z.string(), // Passkey credential ID for signing
});

export type StoredWallet = z.infer<typeof StoredWalletSchema>;

/**
 * Agent status
 */
export const AgentStatusSchema = z.enum(['active', 'inactive', 'revoked']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

/**
 * Agent - paired AI agent
 */
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  pairedAt: z.number(), // Unix timestamp in ms
  lastSeen: z.number().nullable(), // Unix timestamp in ms, null if never
  status: AgentStatusSchema,
});

export type Agent = z.infer<typeof AgentSchema>;

/**
 * Session status
 */
export const SessionStatusSchema = z.enum([
  'pending', // Waiting for user approval
  'active', // Approved and currently valid
  'expired', // Time limit reached
  'revoked', // User manually revoked
  'exhausted', // Spending limits reached
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Spent amounts tracking
 */
export const SpentAmountsSchema = z.record(z.string(), z.number());
export type SpentAmounts = z.infer<typeof SpentAmountsSchema>;

/**
 * Session - time-limited spending session for an agent
 */
export const SessionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  walletPubkey: z.string(),
  sessionPubkey: z.string(),
  limits: z.array(SpendingLimitSchema),
  durationSeconds: z.number().positive(),
  createdAt: z.number(), // Unix timestamp in ms
  expiresAt: z.number(), // Unix timestamp in ms
  status: SessionStatusSchema,
  spent: SpentAmountsSchema, // mint -> amount spent (in base units)
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Transaction type
 */
export const TransactionTypeSchema = z.enum([
  'transfer', // SOL transfer
  'token_transfer', // SPL token transfer
  'other', // Other transaction types
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

/**
 * Transaction status
 */
export const TransactionStatusSchema = z.enum(['pending', 'confirmed', 'failed']);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * Transaction - on-chain transaction record
 */
export const TransactionSchema = z.object({
  signature: z.string(),
  type: TransactionTypeSchema,
  from: z.string(),
  to: z.string(),
  amount: z.number(), // In base units (lamports for SOL)
  mint: z.string().nullable(), // null for SOL, token mint for SPL
  symbol: z.string().nullable(), // "SOL" or token symbol
  timestamp: z.number(), // Unix timestamp in ms
  status: TransactionStatusSchema,
  sessionId: z.string().nullable(), // null if not from a session
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Token balance
 */
export const TokenBalanceSchema = z.object({
  mint: z.string(), // "native" for SOL or token mint pubkey
  amount: z.number(), // In base units
  decimals: z.number().int().nonnegative(),
  symbol: z.string().nullable(),
  uiAmount: z.number(), // Human-readable amount
  logoUri: z.string().nullable(),
});

export type TokenBalance = z.infer<typeof TokenBalanceSchema>;

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API error response
 */
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Pairing request response
 */
export const PairingRequestResponseSchema = z.object({
  requestId: z.string(),
  code: z.string(),
  expiresAt: z.number(),
});

export type PairingRequestResponse = z.infer<typeof PairingRequestResponseSchema>;

/**
 * Pairing status response
 */
export const PairingStatusResponseSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired']),
  walletPubkey: z.string().optional(),
  authSecret: z.string().optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
});

export type PairingStatusResponse = z.infer<typeof PairingStatusResponseSchema>;

/**
 * Session request response
 */
export const SessionRequestResponseSchema = z.object({
  requestId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  session: SessionSchema.optional(),
});

export type SessionRequestResponse = z.infer<typeof SessionRequestResponseSchema>;

/**
 * Session details response
 */
export const SessionDetailsResponseSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired']),
  session: SessionSchema.optional(),
});

export type SessionDetailsResponse = z.infer<typeof SessionDetailsResponseSchema>;

/**
 * Transfer response
 */
export const TransferResponseSchema = z.object({
  signature: z.string(),
  status: TransactionStatusSchema,
});

export type TransferResponse = z.infer<typeof TransferResponseSchema>;

/**
 * Wallet balance response
 */
export const WalletBalanceResponseSchema = z.object({
  balances: z.array(TokenBalanceSchema),
  totalUsdValue: z.number().nullable(),
});

export type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;

/**
 * Transaction history response
 */
export const TransactionHistoryResponseSchema = z.object({
  transactions: z.array(TransactionSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

export type TransactionHistoryResponse = z.infer<typeof TransactionHistoryResponseSchema>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Loading state for async operations
 */
export type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/**
 * Pagination params
 */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

/**
 * Deep link params
 */
export interface DeepLinkParams {
  action: 'pair' | 'approve-session';
  code?: string;
  requestId?: string;
}

// ============================================================================
// Store Types
// ============================================================================

/**
 * Wallet store state
 */
export interface WalletStoreState {
  wallets: StoredWallet[];
  activeWalletPubkey: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Agent store state
 */
export interface AgentStoreState {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Session store state
 */
export interface SessionStoreState {
  sessions: Session[];
  pendingRequests: SessionRequestResponse[];
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safe parse helper that returns Result type
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown): Result<T, z.ZodError> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return { ok: false, error: result.error };
}

/**
 * Parse or throw with better error message
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const message = context ? `${context}: ${result.error.message}` : result.error.message;
  throw new Error(message);
}
