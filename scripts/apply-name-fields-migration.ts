/**
 * Apply name fields migration to add first_name and last_name columns
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  try {
    console.log('📝 Applying name fields migration...\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '010_add_name_fields.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Attempting direct SQL execution...');

      // Split and execute each statement
      const statements = [
        'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT, ADD COLUMN IF NOT EXISTS last_name TEXT',
        `UPDATE public.users
         SET
           first_name = CASE
             WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
             THEN split_part(full_name, ' ', 1)
             ELSE full_name
           END,
           last_name = CASE
             WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
             THEN substring(full_name FROM position(' ' IN full_name) + 1)
             ELSE NULL
           END
         WHERE first_name IS NULL`
      ];

      for (const stmt of statements) {
        const { error: stmtError } = await (supabase as any).rpc('exec_sql', { sql: stmt });
        if (stmtError) {
          console.error(`Error executing statement: ${stmtError.message}`);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('The users table now has first_name and last_name columns.');

  } catch (err) {
    console.error('❌ Error applying migration:', err);
    process.exit(1);
  }
}

applyMigration();
