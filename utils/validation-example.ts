/**
 * EXAMPLES: How to use validation utilities in your application
 * 
 * This file demonstrates best practices for using the validation
 * and sanitization utilities across the application.
 */

import { 
  ContactSchema, 
  DomainSchema, 
  validateData, 
  formatValidationErrors,
  sanitizeText,
  sanitizeHtml,
  sanitizeEmail
} from './validation';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

// ============================================================================
// EXAMPLE 1: Validating Contact Form Submission
// ============================================================================

export async function handleContactFormSubmit(formData: any) {
  // Validate the contact data
  const validation = validateData(ContactSchema, formData);
  
  if (!validation.success) {
    const errors = formatValidationErrors(validation.error);
    toast.error(`Validation failed: ${errors.join(', ')}`);
    return null;
  }

  // Data is now sanitized and validated
  const sanitizedContact = validation.data;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('You must be logged in to create contacts');
    return null;
  }

  // Insert into database with user_id
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...sanitizedContact, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    toast.error('Failed to create contact');
    return null;
  }

  toast.success('Contact created successfully!');
  return data;
}

// ============================================================================
// EXAMPLE 2: Validating Domain Before Adding
// ============================================================================

export async function handleAddDomain(domainData: any) {
  const validation = validateData(DomainSchema, domainData);
  
  if (!validation.success) {
    const errors = formatValidationErrors(validation.error);
    toast.error(`Invalid domain: ${errors[0]}`);
    return null;
  }

  const sanitizedDomain = validation.data;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('You must be logged in');
    return null;
  }

  // Check if domain already exists for this user
  const { data: existing } = await supabase
    .from('domains')
    .select('id')
    .eq('name', sanitizedDomain.name)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    toast.error('This domain already exists in your account');
    return null;
  }

  // Insert domain
  const { data, error } = await supabase
    .from('domains')
    .insert({ ...sanitizedDomain, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    toast.error('Failed to add domain');
    return null;
  }

  toast.success('Domain added successfully!');
  return data;
}

// ============================================================================
// EXAMPLE 3: Sanitizing User Input in Real-Time
// ============================================================================

export function handleTextInput(event: React.ChangeEvent<HTMLInputElement>) {
  const sanitized = sanitizeText(event.target.value);
  // Update your state with sanitized value
  return sanitized;
}

export function handleHtmlInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
  const sanitized = sanitizeHtml(event.target.value);
  // Update your state with sanitized HTML
  return sanitized;
}

export function handleEmailInput(event: React.ChangeEvent<HTMLInputElement>) {
  const sanitized = sanitizeEmail(event.target.value);
  // Update your state with sanitized email
  return sanitized;
}

// ============================================================================
// EXAMPLE 4: Validating Bulk Import
// ============================================================================

export async function handleBulkContactImport(contacts: any[]) {
  const results = {
    successful: [] as any[],
    failed: [] as { contact: any; errors: string[] }[],
  };

  for (const contact of contacts) {
    const validation = validateData(ContactSchema, contact);
    
    if (validation.success) {
      results.successful.push(validation.data);
    } else {
      results.failed.push({
        contact,
        errors: formatValidationErrors(validation.error),
      });
    }
  }

  if (results.failed.length > 0) {
    console.warn(`${results.failed.length} contacts failed validation:`, results.failed);
    toast.error(`${results.failed.length} contacts failed validation. Check console for details.`);
  }

  if (results.successful.length > 0) {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return results;
    }

    // Add user_id to all successful contacts
    const contactsWithUserId = results.successful.map(c => ({
      ...c,
      user_id: user.id
    }));

    // Insert all successful contacts
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactsWithUserId)
      .select();

    if (error) {
      console.error('Database error:', error);
      toast.error('Failed to import contacts');
    } else {
      toast.success(`Successfully imported ${data.length} contacts!`);
    }
  }

  return results;
}

// ============================================================================
// EXAMPLE 5: Validating Before Updating
// ============================================================================

export async function handleUpdateContact(contactId: number, updates: any) {
  // Validate the updates
  const validation = validateData(ContactSchema, updates);
  
  if (!validation.success) {
    const errors = formatValidationErrors(validation.error);
    toast.error(`Invalid data: ${errors.join(', ')}`);
    return null;
  }

  const sanitizedUpdates = validation.data;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('You must be logged in');
    return null;
  }

  // Update contact (RLS will ensure user can only update their own contacts)
  const { data, error } = await supabase
    .from('contacts')
    .update(sanitizedUpdates)
    .eq('id', contactId)
    .eq('user_id', user.id) // Ensure user owns this contact
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    toast.error('Failed to update contact');
    return null;
  }

  toast.success('Contact updated successfully!');
  return data;
}
