import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log('🚀 Applying database migrations...\n');

  try {
    // Read migration files
    const migration024 = readFileSync(
      join(process.cwd(), 'supabase/migrations/024_add_testimonials.sql'),
      'utf-8'
    );

    const migration025 = readFileSync(
      join(process.cwd(), 'supabase/migrations/025_add_support_tickets.sql'),
      'utf-8'
    );

    console.log('📄 Applying 024_add_testimonials.sql...');

    // Use rpc to execute SQL (note: this requires a custom RPC function in Supabase)
    // Alternative: We need to use the Supabase Management API or psql

    // For now, let's just output instructions for manual application
    console.log('\n⚠️  Direct SQL execution requires Supabase Dashboard or psql.\n');
    console.log('=' .repeat(80));
    console.log('MANUAL MIGRATION STEPS:');
    console.log('=' .repeat(80));
    console.log('\n1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Copy and paste the SQL below:\n');
    console.log('--- MIGRATION 024: TESTIMONIALS ---');
    console.log(migration024);
    console.log('\n5. Click "Run"');
    console.log('6. Verify success message\n');
    console.log('7. Then copy and paste this SQL:\n');
    console.log('--- MIGRATION 025: SUPPORT TICKETS ---');
    console.log(migration025);
    console.log('\n8. Click "Run"');
    console.log('9. Verify success message\n');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyMigrations();
