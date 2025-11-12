/**
 * Zod Validation Schemas for API Routes
 * Ensures all inputs are properly validated before processing
 */

import { z } from 'zod';

/**
 * Common reusable schemas
 */
export const emailSchema = z.string().email('Invalid email address');
export const uuidSchema = z.string().uuid('Invalid ID format');
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
export const phoneSchema = z.string().regex(/^[0-9\s\-\(\)]+$/, 'Invalid phone number').optional();
export const urlSchema = z.string().url('Invalid URL').optional();

/**
 * Profile Report Schema
 */
export const reportIssueSchema = z.object({
  lobbyistId: uuidSchema,
  lobbyistName: z.string().min(1, 'Lobbyist name required').max(200),
  issueType: z.enum([
    'incorrect_info',
    'outdated_clients',
    'fraudulent_claims',
    'duplicate_profile',
    'inappropriate_content',
    'other',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  reporterEmail: emailSchema.optional(),
});

/**
 * AI Search Schema
 */
export const aiSearchSchema = z.object({
  query: z.string().min(3, 'Search query must be at least 3 characters').max(500),
  context: z.string().optional(),
});

/**
 * Profile Creation Schema
 */
export const createProfileSchema = z.object({
  formData: z.object({
    firstName: z.string().min(1, 'First name required').max(100),
    lastName: z.string().min(1, 'Last name required').max(100),
    email: emailSchema,
    phone: phoneSchema,
    website: urlSchema,
    linkedin: urlSchema,
    bio: z.string().max(5000).optional(),
    cities: z.array(z.string()).min(1, 'At least one city required'),
    subjectAreas: z.array(z.string()).min(1, 'At least one expertise area required'),
    idVerificationUrl: z.string().optional(),
  }),
});

/**
 * Profile Update Schema
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  website: urlSchema,
  linkedinUrl: urlSchema,
  bio: z.string().max(5000).optional(),
  cities: z.array(z.string()).optional(),
  subjectAreas: z.array(z.string()).optional(),
});

/**
 * Admin Profile Approval Schema
 */
export const approveProfileSchema = z.object({
  profileId: uuidSchema,
  notes: z.string().max(1000).optional(),
});

/**
 * Admin Profile Rejection Schema
 */
export const rejectProfileSchema = z.object({
  lobbyistId: uuidSchema,
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000),
  category: z.enum([
    'incomplete_info',
    'invalid_credentials',
    'duplicate_profile',
    'suspicious_activity',
    'other',
  ]),
  userMessage: z.string().min(10).max(500),
});

/**
 * Client Management Schema
 */
export const clientSchema = z.object({
  name: z.string().min(1, 'Client name required').max(200),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Testimonial Schema
 */
export const testimonialSchema = z.object({
  clientName: z.string().min(1).max(200),
  clientTitle: z.string().max(200).optional(),
  clientCompany: z.string().max(200).optional(),
  testimonialText: z.string().min(10, 'Testimonial must be at least 10 characters').max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().default(false),
});

/**
 * Bill Tagging Schema
 */
export const billTagSchema = z.object({
  billId: uuidSchema,
  tagType: z.enum(['supporting', 'opposing', 'monitoring', 'tracking']),
  contextNotes: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
});

/**
 * Contact Form Schema
 */
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name required').max(200),
  email: emailSchema,
  subject: z.string().min(1, 'Subject required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  phone: phoneSchema,
});

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * Validate request body against a schema
 * Returns parsed data or throws validation error
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Validation failed',
        error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    throw error;
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQueryParams<T>(
  url: URL,
  schema: z.ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(url.searchParams);
    // Convert string numbers to actual numbers
    const converted: any = {};
    for (const [key, value] of Object.entries(params)) {
      const num = Number(value);
      converted[key] = isNaN(num) ? value : num;
    }
    return schema.parse(converted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid query parameters',
        error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    throw error;
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  toJSON() {
    return {
      error: this.message,
      details: this.errors,
    };
  }
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(error: ValidationError): Response {
  return new Response(JSON.stringify(error.toJSON()), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
