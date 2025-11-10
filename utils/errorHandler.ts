/**
 * Centralized Error Handling Utilities
 * 
 * This module provides consistent error handling across the application,
 * ensuring sensitive information is never exposed to users while maintaining
 * proper logging for debugging.
 */

import toast from 'react-hot-toast';
import { PostgrestError } from '@supabase/supabase-js';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  API = 'API_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  originalError?: any;
  timestamp: Date;
  context?: Record<string, any>;
}

// ============================================================================
// ERROR CREATION FUNCTIONS
// ============================================================================

/**
 * Create a standardized application error
 */
export function createAppError(
  type: ErrorType,
  message: string,
  userMessage: string,
  originalError?: any,
  context?: Record<string, any>
): AppError {
  return {
    type,
    message,
    userMessage,
    originalError,
    timestamp: new Date(),
    context,
  };
}

/**
 * Handle validation errors
 */
export function createValidationError(
  message: string,
  userMessage: string = 'Please check your input and try again',
  context?: Record<string, any>
): AppError {
  return createAppError(ErrorType.VALIDATION, message, userMessage, null, context);
}

/**
 * Handle database errors
 */
export function createDatabaseError(
  error: PostgrestError | any,
  userMessage: string = 'A database error occurred. Please try again later.',
  context?: Record<string, any>
): AppError {
  return createAppError(
    ErrorType.DATABASE,
    error?.message || 'Database operation failed',
    userMessage,
    error,
    context
  );
}

/**
 * Handle network errors
 */
export function createNetworkError(
  error: any,
  userMessage: string = 'Network error. Please check your connection and try again.',
  context?: Record<string, any>
): AppError {
  return createAppError(
    ErrorType.NETWORK,
    error?.message || 'Network request failed',
    userMessage,
    error,
    context
  );
}

/**
 * Handle authentication errors
 */
export function createAuthError(
  message: string = 'Authentication failed',
  userMessage: string = 'Please log in to continue.',
  context?: Record<string, any>
): AppError {
  return createAppError(ErrorType.AUTHENTICATION, message, userMessage, null, context);
}

/**
 * Handle authorization errors
 */
export function createAuthorizationError(
  message: string = 'Unauthorized access',
  userMessage: string = 'You do not have permission to perform this action.',
  context?: Record<string, any>
): AppError {
  return createAppError(ErrorType.AUTHORIZATION, message, userMessage, null, context);
}

/**
 * Handle API errors
 */
export function createAPIError(
  error: any,
  userMessage: string = 'An error occurred while processing your request.',
  context?: Record<string, any>
): AppError {
  return createAppError(
    ErrorType.API,
    error?.message || 'API request failed',
    userMessage,
    error,
    context
  );
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log error to console (in development) or error tracking service (in production)
 */
export function logError(error: AppError): void {
  // In development, log full error details
  if (import.meta.env.DEV) {
    console.error('Application Error:', {
      type: error.type,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      context: error.context,
      originalError: error.originalError,
    });
  } else {
    // In production, only log sanitized information
    console.error('Error occurred:', {
      type: error.type,
      timestamp: error.timestamp,
      // Don't log full error details in production
    });

    // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error.originalError || new Error(error.message), {
    //     tags: { errorType: error.type },
    //     extra: { context: error.context },
    //   });
    // }
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle an error - log it and show user-friendly message
 */
export function handleError(error: AppError, showToast: boolean = true): void {
  logError(error);

  if (showToast) {
    toast.error(error.userMessage);
  }
}

/**
 * Handle unknown errors and convert to AppError
 */
export function handleUnknownError(
  error: unknown,
  userMessage: string = 'An unexpected error occurred. Please try again.',
  context?: Record<string, any>
): AppError {
  const appError = createAppError(
    ErrorType.UNKNOWN,
    error instanceof Error ? error.message : 'Unknown error',
    userMessage,
    error,
    context
  );

  handleError(appError);
  return appError;
}

// ============================================================================
// SUPABASE ERROR HANDLERS
// ============================================================================

/**
 * Handle Supabase database errors with specific messages
 */
export function handleSupabaseError(error: PostgrestError, operation: string): AppError {
  let userMessage = 'An error occurred. Please try again.';

  // Map common Supabase error codes to user-friendly messages
  switch (error.code) {
    case '23505': // Unique violation
      userMessage = 'This record already exists.';
      break;
    case '23503': // Foreign key violation
      userMessage = 'Cannot complete operation due to related records.';
      break;
    case '42501': // Insufficient privilege (RLS)
      userMessage = 'You do not have permission to access this resource.';
      break;
    case 'PGRST116': // No rows returned
      userMessage = 'Record not found.';
      break;
    case 'PGRST301': // RLS policy violation
      userMessage = 'You do not have permission to perform this action.';
      break;
    default:
      userMessage = `Failed to ${operation}. Please try again.`;
  }

  return createDatabaseError(error, userMessage, { operation });
}

// ============================================================================
// API ERROR HANDLERS
// ============================================================================

/**
 * Handle fetch API errors
 */
export async function handleFetchError(response: Response, operation: string): Promise<AppError> {
  let userMessage = 'An error occurred. Please try again.';
  let errorDetails: any = {};

  try {
    errorDetails = await response.json();
  } catch {
    // Response is not JSON
  }

  switch (response.status) {
    case 400:
      userMessage = 'Invalid request. Please check your input.';
      break;
    case 401:
      userMessage = 'You must be logged in to perform this action.';
      break;
    case 403:
      userMessage = 'You do not have permission to perform this action.';
      break;
    case 404:
      userMessage = 'Resource not found.';
      break;
    case 429:
      userMessage = 'Too many requests. Please try again later.';
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      userMessage = 'Server error. Please try again later.';
      break;
    default:
      userMessage = `Failed to ${operation}. Please try again.`;
  }

  return createAPIError(
    errorDetails,
    userMessage,
    { operation, status: response.status }
  );
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wrap async functions with error handling
 * Usage: const result = await withErrorHandling(someAsyncFunction, 'operation name')
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  operationName: string,
  options: {
    showToast?: boolean;
    onError?: (error: AppError) => void;
    context?: Record<string, any>;
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  const { showToast = true, onError, context } = options;

  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = handleUnknownError(
      error,
      `Failed to ${operationName}. Please try again.`,
      context
    );

    if (showToast) {
      handleError(appError);
    }

    if (onError) {
      onError(appError);
    }

    return { success: false, error: appError };
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
