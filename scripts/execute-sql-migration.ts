import postgres from 'postgres';

async function executeMigration() {
  // Use direct postgres connection with the connection pooler
  const connectionString = `postgresql://postgres.tavwfbqflredtowjelbx:${process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

  console.log('🔌 Connecting to Supabase database...\n');

  // Try alternative: use REST API to execute SQL
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sql = `
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
ON public.users(cancel_at_period_end)
WHERE cancel_at_period_end = true;

COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';
  `.trim();

  console.log('📝 Executing SQL:\n');
  console.log(sql);
  console.log('\n');

  try {
    // Use Supabase Management API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('❌ REST API failed:', error);
      console.log('\n📋 Please manually run this SQL in Supabase SQL Editor:');
      console.log('━'.repeat(70));
      console.log(sql);
      console.log('━'.repeat(70));
      console.log('\n💡 Go to: https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new\n');
      return false;
    }

    console.log('✅ Successfully added cancel_at_period_end column!\n');
    return true;

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please manually run this SQL in Supabase SQL Editor:');
    console.log('━'.repeat(70));
    console.log(sql);
    console.log('━'.repeat(70));
    console.log('\n💡 Go to: https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new\n');
    return false;
  }
}

executeMigration().then(success => {
  if (success) {
    console.log('✅ Migration complete! Now syncing cancel state from Stripe...\n');
  } else {
    console.log('⚠️  Migration failed. Please run SQL manually.\n');
  }
});
