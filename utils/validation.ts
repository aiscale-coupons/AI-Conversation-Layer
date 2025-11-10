import { z } from 'zod';
import DOMPurify from 'dompurify';

// ============================================================================
// SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitize plain text by removing any HTML tags
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Contact validation schema
 */
export const ContactSchema = z.object({
  id: z.number().optional(),
  created_at: z.string().optional(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .transform(sanitizeText),
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters')
    .transform(sanitizeText),
  industry: z.string()
    .min(1, 'Industry is required')
    .max(200, 'Industry must be less than 200 characters')
    .transform(sanitizeText),
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters')
    .transform(sanitizeText),
  painPointSignal: z.string()
    .min(1, 'Pain point signal is required')
    .max(500, 'Pain point signal must be less than 500 characters')
    .transform(sanitizeText),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(sanitizeEmail),
  user_id: z.string().uuid().optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;

/**
 * Domain validation schema
 */
export const DomainSchema = z.object({
  id: z.number().optional(),
  created_at: z.string().optional(),
  name: z.string()
    .min(3, 'Domain name must be at least 3 characters')
    .max(253, 'Domain name must be less than 253 characters')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*\.[a-zA-Z]{2,}$/, 'Invalid domain name format')
    .transform(s => s.toLowerCase()),
  spf: z.boolean().default(false),
  dkim: z.boolean().default(false),
  dmarc: z.boolean().default(false),
  user_id: z.string().uuid().optional(),
});

export type DomainInput = z.infer<typeof DomainSchema>;

/**
 * Inbox validation schema
 */
export const InboxSchema = z.object({
  id: z.number().optional(),
  created_at: z.string().optional(),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(sanitizeEmail),
  domain: z.string()
    .min(3, 'Domain must be at least 3 characters')
    .max(253, 'Domain must be less than 253 characters')
    .transform(s => s.toLowerCase()),
  status: z.enum(['warming', 'active', 'error']),
  dailyLimit: z.number()
    .int('Daily limit must be an integer')
    .min(1, 'Daily limit must be at least 1')
    .max(10000, 'Daily limit must be less than 10000'),
  user_id: z.string().uuid().optional(),
});

export type InboxInput = z.infer<typeof InboxSchema>;

/**
 * Campaign validation schema
 */
export const CampaignSchema = z.object({
  id: z.number().optional(),
  created_at: z.string().optional(),
  name: z.string()
    .min(1, 'Campaign name is required')
    .max(200, 'Campaign name must be less than 200 characters')
    .transform(sanitizeText),
  status: z.enum(['Active', 'Paused', 'Completed']),
  contacts: z.number().int().min(0).default(0),
  sent: z.number().int().min(0).default(0),
  open_rate: z.number().min(0).max(100).default(0),
  reply_rate: z.number().min(0).max(100).default(0),
  user_id: z.string().uuid().optional(),
});

export type CampaignInput = z.infer<typeof CampaignSchema>;

/**
 * Email step validation schema
 */
export const EmailStepSchema = z.object({
  id: z.number().optional(),
  sequence_id: z.number().optional(),
  delayDays: z.number()
    .int('Delay days must be an integer')
    .min(0, 'Delay days must be at least 0')
    .max(365, 'Delay days must be less than 365'),
  subjectA: z.string()
    .min(1, 'Subject A is required')
    .max(200, 'Subject A must be less than 200 characters')
    .transform(sanitizeText),
  subjectB: z.string()
    .max(200, 'Subject B must be less than 200 characters')
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  body: z.string()
    .min(1, 'Email body is required')
    .max(10000, 'Email body must be less than 10000 characters')
    .transform(sanitizeHtml),
  useAbTest: z.boolean().default(false),
  user_id: z.string().uuid().optional(),
});

export type EmailStepInput = z.infer<typeof EmailStepSchema>;

/**
 * Sequence validation schema
 */
export const SequenceSchema = z.object({
  id: z.number().optional(),
  created_at: z.string().optional(),
  name: z.string()
    .min(1, 'Sequence name is required')
    .max(200, 'Sequence name must be less than 200 characters')
    .transform(sanitizeText),
  steps: z.array(EmailStepSchema),
  user_id: z.string().uuid().optional(),
});

export type SequenceInput = z.infer<typeof SequenceSchema>;

/**
 * Reply validation schema
 */
export const ReplySchema = z.object({
  id: z.number().optional(),
  created_at: z.string().optional(),
  from: z.string()
    .email('Invalid sender email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(sanitizeEmail),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(500, 'Subject must be less than 500 characters')
    .transform(sanitizeText),
  body: z.string()
    .min(1, 'Reply body is required')
    .max(50000, 'Reply body must be less than 50000 characters')
    .transform(sanitizeHtml),
  intent: z.enum(['Positive', 'Referral', 'Objection', 'Opt-out', 'Neutral', 'Unknown']).optional(),
  user_id: z.string().uuid().optional(),
});

export type ReplyInput = z.infer<typeof ReplySchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and sanitize data against a schema
 * Returns either success with data or error with validation issues
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Format validation errors into user-friendly messages
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
}

/**
 * Validate array of data
 */
export function validateArray<T>(
  schema: z.ZodSchema<T>,
  dataArray: unknown[]
): { success: true; data: T[] } | { success: false; errors: string[] } {
  const results = dataArray.map((item, index) => ({
    index,
    result: validateData(schema, item)
  }));

  const failures = results.filter(r => !r.result.success);
  
  if (failures.length > 0) {
    const errors = failures.flatMap(f => 
      f.result.success ? [] : [`Item ${f.index}: ${formatValidationErrors(f.result.error).join(', ')}`]
    );
    return { success: false, errors };
  }

  const validData = results
    .map(r => r.result.success ? r.result.data : null)
    .filter((d): d is T => d !== null);

  return { success: true, data: validData };
}
