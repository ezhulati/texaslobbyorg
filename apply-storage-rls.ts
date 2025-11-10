import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyStoragePolicies() {
  console.log('📋 Applying storage RLS policies...\n');

  const sql = readFileSync('apply-storage-policies.sql', 'utf-8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.length < 10) continue; // Skip very short statements

    console.log('Executing:', statement.substring(0, 60) + '...');

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      });

      if (error) {
        console.error('❌ Error:', error.message);
      } else {
        console.log('✅ Success\n');
      }
    } catch (err: any) {
      console.error('❌ Error executing SQL:', err.message);
    }
  }

  console.log('\n✨ Storage policies applied! Try uploading your photo again.');
}

applyStoragePolicies().catch(console.error);
