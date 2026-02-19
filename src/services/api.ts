/**
 * Odyssey API Client
 * HTTP client with typed responses and Zod validation
 */

import { z } from 'zod';
import {
  PairingRequestResponseSchema,
  PairingStatusResponseSchema,
  SessionRequestResponseSchema,
  SessionDetailsResponseSchema,
  TransferResponseSchema,
  SpendingLimitSchema,
  SessionSchema,
  ApiErrorSchema,
  type PairingRequestResponse,
  type PairingStatusResponse,
  type SessionRequestResponse,
  type SessionDetailsResponse,
  type TransferResponse,
  type SpendingLimit,
  type ApiError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

// Default API URL - can be overridden via environment
const DEFAULT_API_URL = 'http://localhost:3001';

function getApiUrl(): string {
  // In React Native, we'd typically use expo-constants or a config file
  // For now, use the default
  return DEFAULT_API_URL;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error class with typed error details
 */
export class OdysseyApiError extends Error {
  public readonly code?: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'OdysseyApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static fromApiError(apiError: ApiError, statusCode: number): OdysseyApiError {
    return new OdysseyApiError(apiError.error, statusCode, apiError.code, apiError.details);
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Validation error for response parsing failures
 */
export class ValidationError extends Error {
  public readonly zodError: z.ZodError;

  constructor(message: string, zodError: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
    this.zodError = zodError;
  }
}

// Union type for all API errors
export type ApiClientError = OdysseyApiError | NetworkError | ValidationError;

// ============================================================================
// HTTP Client Helpers
// ============================================================================

interface RequestOptions<TBody = unknown> {
  method: 'GET' | 'POST';
  body?: TBody;
  headers?: Record<string, string>;
}

async function request<T, TBody = unknown>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: RequestOptions<TBody>
): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const json: unknown = await response.json();

    // Handle HTTP errors
    if (!response.ok) {
      const errorResult = ApiErrorSchema.safeParse(json);
      if (errorResult.success) {
        throw OdysseyApiError.fromApiError(errorResult.data, response.status);
      }
      throw new OdysseyApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    // Validate response
    const result = schema.safeParse(json);
    if (!result.success) {
      throw new ValidationError(
        `Invalid response from ${endpoint}: ${result.error.message}`,
        result.error
      );
    }

    return result.data;
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof OdysseyApiError ||
      error instanceof NetworkError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    // Wrap fetch errors
    if (error instanceof TypeError) {
      throw new NetworkError('Network request failed', error);
    }

    // Unknown errors
    throw new NetworkError(`Unexpected error: ${String(error)}`);
  }
}

// ============================================================================
// Request/Response Types
// ============================================================================

// Pairing
interface PairingRequestParams {
  code: string;
  agentId: string;
  agentName: string;
}

// Session request
interface SessionRequestParams {
  agentId: string;
  agentName: string;
  walletPubkey: string;
  sessionPubkey: string;
  durationSeconds: number;
  signature: string;
  timestamp: number;
  authSecret: string;
  limits: SpendingLimit[];
}

// Transfer SOL
interface TransferParams {
  walletPubkey: string;
  sessionPubkey: string;
  sessionSecretKey: string;
  destination: string;
  amountSol: number;
}

// Transfer token
interface TransferTokenParams {
  walletPubkey: string;
  sessionPubkey: string;
  sessionSecretKey: string;
  destination: string;
  mint: string;
  amount: number; // In base units
}

// Sign and send arbitrary transaction
interface SignAndSendParams {
  transaction: string; // Base64 encoded transaction
  sessionPubkey: string;
  sessionSecretKey: string;
}

// Sign and send response schema
const SignAndSendResponseSchema = z.object({
  signature: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
});

type SignAndSendResponse = z.infer<typeof SignAndSendResponseSchema>;

// Session approve params
interface SessionApproveParams {
  requestId: string;
  walletPubkey: string;
  signature: string; // Signed approval from wallet
}

// Session approve response schema
const SessionApproveResponseSchema = z.object({
  status: z.literal('approved'),
  session: SessionSchema.optional(),
});

type SessionApproveResponse = z.infer<typeof SessionApproveResponseSchema>;

// Session reject response schema
const SessionRejectResponseSchema = z.object({
  status: z.literal('rejected'),
});

type SessionRejectResponse = z.infer<typeof SessionRejectResponseSchema>;

// ============================================================================
// API Client
// ============================================================================

/**
 * Pairing API methods
 */
const pairing = {
  /**
   * Submit a pairing request
   * Agent calls this with the code shown on the mobile app
   */
  async request(params: PairingRequestParams): Promise<PairingRequestResponse> {
    return request('/api/pairing/request', PairingRequestResponseSchema, {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Check pairing request status
   * Poll this endpoint until status is approved/rejected/expired
   */
  async getStatus(requestId: string): Promise<PairingStatusResponse> {
    return request(`/api/pairing/${requestId}`, PairingStatusResponseSchema, {
      method: 'GET',
    });
  },
};

/**
 * Session API methods
 */
const session = {
  /**
   * Request a new spending session
   * Agent submits session request with spending limits
   */
  async request(params: SessionRequestParams): Promise<SessionRequestResponse> {
    // Validate limits before sending
    const limitsResult = z.array(SpendingLimitSchema).safeParse(params.limits);
    if (!limitsResult.success) {
      throw new ValidationError('Invalid spending limits', limitsResult.error);
    }

    return request('/api/request-session', SessionRequestResponseSchema, {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Get session request details
   * Poll this endpoint to check if session was approved
   */
  async getDetails(requestId: string): Promise<SessionDetailsResponse> {
    return request(`/api/session-details/${requestId}`, SessionDetailsResponseSchema, {
      method: 'GET',
    });
  },

  /**
   * Transfer SOL using an active session
   */
  async transfer(params: TransferParams): Promise<TransferResponse> {
    return request('/api/session/transfer', TransferResponseSchema, {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Transfer SPL tokens using an active session
   */
  async transferToken(params: TransferTokenParams): Promise<TransferResponse> {
    return request('/api/session/transfer-token', TransferResponseSchema, {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Sign and send an arbitrary transaction
   * Agent builds the transaction, API signs and submits
   */
  async signAndSend(params: SignAndSendParams): Promise<SignAndSendResponse> {
    return request('/api/session/sign-and-send', SignAndSendResponseSchema, {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Approve a pending session request
   * Called by mobile wallet to approve an agent's session request
   */
  async approve(params: SessionApproveParams): Promise<SessionApproveResponse> {
    return request('/api/session/approve', SessionApproveResponseSchema, {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Reject a pending session request
   * Called by mobile wallet to reject an agent's session request
   */
  async reject(requestId: string): Promise<SessionRejectResponse> {
    return request('/api/session/reject', SessionRejectResponseSchema, {
      method: 'POST',
      body: { requestId },
    });
  },
};

// ============================================================================
// Exported API Object
// ============================================================================

export const api = {
  pairing,
  session,
} as const;

// Re-export types for consumers
export type {
  PairingRequestParams,
  SessionRequestParams,
  TransferParams,
  TransferTokenParams,
  SignAndSendParams,
  SignAndSendResponse,
  SessionApproveParams,
  SessionApproveResponse,
  SessionRejectResponse,
};
