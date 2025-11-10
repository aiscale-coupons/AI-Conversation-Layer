/**
 * EXAMPLES: How to use error handling utilities
 * 
 * This file demonstrates best practices for error handling
 * across the application.
 */

import { 
  handleError,
  handleSupabaseError,
  handleFetchError,
  withErrorHandling,
  retryWithBackoff,
  createAuthError,
  createValidationError,
} from './errorHandler';
import { supabase } from '../supabase/client';
import { validateData, ContactSchema } from './validation';

// ============================================================================
// EXAMPLE 1: Handling Supabase Errors
// ============================================================================

export async function fetchUserContacts() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    const authError = createAuthError();
    handleError(authError);
    return null;
  }

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    const appError = handleSupabaseError(error, 'fetch contacts');
    handleError(appError);
    return null;
  }

  return data;
}

// ============================================================================
// EXAMPLE 2: Handling API Errors
// ============================================================================

export async function generateEmail(contactData: any) {
  try {
    const response = await fetch('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      const appError = await handleFetchError(response, 'generate email');
      handleError(appError);
      return null;
    }

    return await response.json();
  } catch (error) {
    const appError = createValidationError(
      'Network request failed',
      'Failed to generate email. Please check your connection.'
    );
    handleError(appError);
    return null;
  }
}

// ============================================================================
// EXAMPLE 3: Using withErrorHandling Wrapper
// ============================================================================

export async function createCampaign(campaignData: any) {
  return await withErrorHandling(
    async () => {
      // Validate data
      const validation = validateData(ContactSchema, campaignData);
      if (!validation.success) {
        throw new Error('Validation failed');
      }

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create campaign
      const { data, error } = await supabase
        .from('campaigns')
        .insert({ ...validation.data, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    'create campaign',
    {
      showToast: true,
      context: { campaignData },
    }
  );
}

// ============================================================================
// EXAMPLE 4: Using Retry Logic for Flaky Operations
// ============================================================================

export async function fetchWithRetry(url: string) {
  return await retryWithBackoff(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} after error:`, error);
      },
    }
  );
}

// ============================================================================
// EXAMPLE 5: Complete Form Submission with Error Handling
// ============================================================================

export async function handleCompleteFormSubmit(formData: any) {
  // Wrap entire operation in error handler
  const result = await withErrorHandling(
    async () => {
      // Step 1: Validate input
      const validation = validateData(ContactSchema, formData);
      if (!validation.success) {
        const validationError = createValidationError(
          'Form validation failed',
          'Please check all required fields'
        );
        throw validationError;
      }

      // Step 2: Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        const authErr = createAuthError();
        throw authErr;
      }

      // Step 3: Submit to database with retry logic
      const dbResult = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('contacts')
            .insert({ ...validation.data, user_id: user.id })
            .select()
            .single();

          if (error) {
            const dbError = handleSupabaseError(error, 'create contact');
            throw dbError;
          }

          return data;
        },
        {
          maxRetries: 2,
          initialDelay: 500,
        }
      );

      return dbResult;
    },
    'submit form',
    {
      showToast: true,
      context: { formData },
      onError: (error) => {
        // Custom error handling logic
        console.log('Form submission failed:', error);
        // Could trigger analytics event, etc.
      },
    }
  );

  if (result.success) {
    console.log('Form submitted successfully:', result.data);
    return result.data;
  } else {
    console.error('Form submission failed:', result.error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 6: Error Boundary Compatible Error Handling
// ============================================================================

export class AsyncOperationError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AsyncOperationError';
  }
}

export async function criticalOperation() {
  try {
    // Perform critical operation
    const result = await fetch('/api/critical-endpoint');
    
    if (!result.ok) {
      throw new AsyncOperationError(
        `API returned ${result.status}`,
        'A critical error occurred. Please contact support.',
        { status: result.status }
      );
    }

    return await result.json();
  } catch (error) {
    if (error instanceof AsyncOperationError) {
      // Let Error Boundary catch this
      throw error;
    }
    
    // Wrap unknown errors
    throw new AsyncOperationError(
      error instanceof Error ? error.message : 'Unknown error',
      'An unexpected error occurred',
      { originalError: error }
    );
  }
}
