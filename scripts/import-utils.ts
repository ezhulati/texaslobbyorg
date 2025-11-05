/**
 * Import Utilities for 2025 Texas Lobbyist Data
 *
 * Provides reusable functions for parsing Excel files, normalizing data,
 * handling deduplication, and managing database operations.
 */

import XLSX from 'xlsx';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';

// Supabase client type
type LobbyistInsert = Database['public']['Tables']['lobbyists']['Insert'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type PoliticalFundCompensationInsert = Database['public']['Tables']['political_fund_compensations']['Insert'];

/**
 * Parse Excel file and return rows as array of objects
 */
export function parseExcelFile(filePath: string, sheetName?: string): any[] {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || workbook.SheetNames[0]}`);
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null, // Use null for empty cells instead of undefined
      raw: false, // Return formatted strings instead of raw values
    });

    return rows;
  } catch (error) {
    console.error(`Error parsing Excel file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Normalize phone number to standardized format
 * Extracts 10 digits and formats as (XXX) XXX-XXXX
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Must have exactly 10 digits for US phone number
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return null if not valid format (don't store bad data)
  return null;
}

/**
 * Normalize email address (lowercase, trim whitespace)
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const trimmed = email.trim().toLowerCase();

  // Basic email validation (has @ and .)
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return trimmed;
  }

  return null;
}

/**
 * Parse array field with various delimiters (semicolon, comma, pipe)
 * Returns array of trimmed, non-empty strings
 */
export function parseArrayField(
  value: string | null | undefined,
  delimiter: string = ';'
): string[] {
  if (!value) return [];

  return value
    .split(delimiter)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Generate URL-friendly slug from text
 * Converts to lowercase, replaces non-alphanumeric with hyphens
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate unique slug by checking database and appending number if needed
 */
export async function generateUniqueSlug(
  firstName: string,
  lastName: string,
  supabase: SupabaseClient<Database>,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(`${firstName} ${lastName}`);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = supabase
      .from('lobbyists')
      .select('id')
      .eq('slug', slug);

    // If updating existing record, exclude it from collision check
    if (excludeId) {
      query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    if (error?.code === 'PGRST116') {
      // No rows returned - slug is available
      return slug;
    }

    if (error) {
      throw new Error(`Error checking slug uniqueness: ${error.message}`);
    }

    // Slug exists, try with counter
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Normalize name (trim, title case)
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      // Preserve all-caps acronyms (e.g., "MBA", "PhD")
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      // Title case for normal words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parse Texas Ethics Commission name format: "Last, First (Title)"
 * Examples:
 *   "Scott, Natalie B. (Ms.)" -> { firstName: "Natalie B.", lastName: "Scott" }
 *   "Abbott, Sean (Mr.)" -> { firstName: "Sean", lastName: "Abbott" }
 *   "Smith, John" -> { firstName: "John", lastName: "Smith" }
 */
export function parseTECName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} | null {
  if (!fullName) return null;

  // Remove title in parentheses (Mr.), (Ms.), (Dr.), etc.
  const withoutTitle = fullName.replace(/\s*\([^)]*\)\s*$/g, '').trim();

  // Split by comma
  const parts = withoutTitle.split(',').map(p => p.trim());

  if (parts.length < 2) {
    // No comma found, try to split by space and assume last word is last name
    const words = withoutTitle.split(/\s+/);
    if (words.length >= 2) {
      const lastName = words[words.length - 1];
      const firstName = words.slice(0, -1).join(' ');
      return {
        firstName: normalizeName(firstName),
        lastName: normalizeName(lastName),
      };
    }
    return null;
  }

  const lastName = parts[0];
  const firstName = parts[1];

  return {
    firstName: normalizeName(firstName),
    lastName: normalizeName(lastName),
  };
}

/**
 * Fuzzy name matching for deduplication
 * Returns true if names are likely the same person
 */
export function namesMatch(
  firstName1: string,
  lastName1: string,
  firstName2: string,
  lastName2: string
): boolean {
  const fn1 = firstName1.toLowerCase().trim();
  const ln1 = lastName1.toLowerCase().trim();
  const fn2 = firstName2.toLowerCase().trim();
  const ln2 = lastName2.toLowerCase().trim();

  // Exact match on both names
  if (fn1 === fn2 && ln1 === ln2) {
    return true;
  }

  // Handle middle names/initials (e.g., "John A Smith" vs "John Smith")
  const fn1Parts = fn1.split(/\s+/);
  const fn2Parts = fn2.split(/\s+/);

  // Check if first name or first initial matches
  const firstNameMatches =
    fn1Parts[0] === fn2Parts[0] ||
    fn1Parts[0].charAt(0) === fn2Parts[0].charAt(0);

  // Last names must match exactly
  const lastNameMatches = ln1 === ln2;

  return firstNameMatches && lastNameMatches;
}

/**
 * Deduplicate lobbyists by name, merging data from multiple sources
 * Prioritizes non-null values, keeps most complete record
 */
export function deduplicateLobbyists(
  lobbyists: Partial<LobbyistInsert>[]
): Partial<LobbyistInsert>[] {
  const uniqueLobbyists = new Map<string, Partial<LobbyistInsert>>();

  for (const lobbyist of lobbyists) {
    if (!lobbyist.first_name || !lobbyist.last_name) {
      console.warn('Skipping lobbyist with missing name:', lobbyist);
      continue;
    }

    // Check if we've seen this person before
    let matchingKey: string | null = null;
    for (const [key, existing] of uniqueLobbyists.entries()) {
      if (
        existing.first_name &&
        existing.last_name &&
        namesMatch(
          lobbyist.first_name,
          lobbyist.last_name,
          existing.first_name,
          existing.last_name
        )
      ) {
        matchingKey = key;
        break;
      }
    }

    if (matchingKey) {
      // Merge with existing record (new data takes precedence for non-null values)
      const existing = uniqueLobbyists.get(matchingKey)!;
      uniqueLobbyists.set(matchingKey, mergeLobbyistData(existing, lobbyist));
    } else {
      // New unique lobbyist
      const key = `${lobbyist.last_name}-${lobbyist.first_name}`.toLowerCase();
      uniqueLobbyists.set(key, lobbyist);
    }
  }

  return Array.from(uniqueLobbyists.values());
}

/**
 * Merge two lobbyist records, prioritizing non-null values
 */
function mergeLobbyistData(
  existing: Partial<LobbyistInsert>,
  incoming: Partial<LobbyistInsert>
): Partial<LobbyistInsert> {
  const merged = { ...existing };

  // Merge scalar fields (prefer non-null values from incoming)
  for (const key of Object.keys(incoming)) {
    const value = incoming[key as keyof LobbyistInsert];
    if (value !== null && value !== undefined && value !== '') {
      merged[key as keyof LobbyistInsert] = value as any;
    }
  }

  // Merge array fields (combine and deduplicate)
  if (incoming.cities && incoming.cities.length > 0) {
    const existingCities = existing.cities || [];
    merged.cities = Array.from(new Set([...existingCities, ...incoming.cities]));
  }

  if (incoming.subject_areas && incoming.subject_areas.length > 0) {
    const existingSubjects = existing.subject_areas || [];
    merged.subject_areas = Array.from(new Set([...existingSubjects, ...incoming.subject_areas]));
  }

  return merged;
}

/**
 * Batch insert records with error handling
 */
export async function batchInsert<T>(
  supabase: SupabaseClient<Database>,
  table: string,
  records: T[],
  batchSize: number = 50
): Promise<{ success: number; errors: number; errorDetails: any[] }> {
  let successCount = 0;
  let errorCount = 0;
  const errorDetails: any[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .insert(batch)
        .select();

      if (error) {
        console.error(`Batch insert error (rows ${i}-${i + batch.length}):`, error.message);
        errorCount += batch.length;
        errorDetails.push({
          batch: `${i}-${i + batch.length}`,
          error: error.message,
          records: batch,
        });
      } else {
        successCount += batch.length;
        console.log(`✓ Inserted ${batch.length} records (${successCount} total)`);
      }
    } catch (error: any) {
      console.error(`Batch insert exception (rows ${i}-${i + batch.length}):`, error.message);
      errorCount += batch.length;
      errorDetails.push({
        batch: `${i}-${i + batch.length}`,
        error: error.message,
        records: batch,
      });
    }
  }

  return { success: successCount, errors: errorCount, errorDetails };
}

/**
 * Upsert lobbyists (update existing, insert new)
 */
export async function upsertLobbyists(
  supabase: SupabaseClient<Database>,
  lobbyists: Partial<LobbyistInsert>[],
  batchSize: number = 50
): Promise<{ inserted: number; updated: number; errors: number; errorDetails: any[] }> {
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errorDetails: any[] = [];

  for (let i = 0; i < lobbyists.length; i += batchSize) {
    const batch = lobbyists.slice(i, i + batchSize);

    for (const lobbyist of batch) {
      try {
        // Check if lobbyist exists by slug
        const { data: existing } = await supabase
          .from('lobbyists')
          .select('id')
          .eq('slug', lobbyist.slug!)
          .single();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('lobbyists')
            .update(lobbyist as any)
            .eq('id', existing.id);

          if (error) {
            errorCount++;
            errorDetails.push({ lobbyist, error: error.message, operation: 'update' });
          } else {
            updatedCount++;
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('lobbyists')
            .insert(lobbyist as any);

          if (error) {
            errorCount++;
            errorDetails.push({ lobbyist, error: error.message, operation: 'insert' });
          } else {
            insertedCount++;
          }
        }
      } catch (error: any) {
        errorCount++;
        errorDetails.push({ lobbyist, error: error.message, operation: 'unknown' });
      }
    }

    console.log(`✓ Processed ${Math.min(i + batchSize, lobbyists.length)}/${lobbyists.length} lobbyists`);
  }

  return { inserted: insertedCount, updated: updatedCount, errors: errorCount, errorDetails };
}

/**
 * Create Supabase service role client for imports (bypasses RLS)
 */
export function createServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Write error report to CSV file
 */
export function writeErrorReport(errors: any[], filePath: string): void {
  const fs = require('fs');

  if (errors.length === 0) {
    return;
  }

  const lines = [
    'Operation,Error,Data',
    ...errors.map(e => {
      const operation = e.operation || 'unknown';
      const error = e.error || 'unknown error';
      const data = JSON.stringify(e.lobbyist || e.records || e).replace(/"/g, '""');
      return `"${operation}","${error}","${data}"`;
    })
  ];

  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`\n📄 Error report written to: ${filePath}`);
}

/**
 * Log import summary statistics
 */
export function logSummary(stats: {
  totalFiles: number;
  totalRows: number;
  lobbyistsImported: number;
  lobbyistsUpdated?: number;
  clientsImported?: number;
  politicalFundsImported?: number;
  errors: number;
  duration: number;
}): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${stats.totalFiles}`);
  console.log(`Total rows read: ${stats.totalRows}`);
  console.log(`Lobbyists imported: ${stats.lobbyistsImported}`);
  if (stats.lobbyistsUpdated !== undefined) {
    console.log(`Lobbyists updated: ${stats.lobbyistsUpdated}`);
  }
  if (stats.clientsImported !== undefined) {
    console.log(`Clients imported: ${stats.clientsImported}`);
  }
  if (stats.politicalFundsImported !== undefined) {
    console.log(`Political fund records: ${stats.politicalFundsImported}`);
  }
  console.log(`Errors: ${stats.errors}`);
  console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(60) + '\n');
}
