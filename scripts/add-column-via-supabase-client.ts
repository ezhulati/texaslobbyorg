import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addColumn() {
  console.log('📝 Adding cancel_at_period_end column via Supabase client...\n');

  const sql = `
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
    ON public.users(cancel_at_period_end)
    WHERE cancel_at_period_end = true;

    COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';
  `;

  try {
    // Use raw SQL query via Supabase
    const { error } = await (supabase as any).rpc('exec', { sql });

    if (error) {
      console.log('❌ RPC method not available\n');
      console.log('📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new\n');
      console.log('━'.repeat(70));
      console.log(sql.trim());
      console.log('━'.repeat(70));
      console.log('\nPress Enter after you\'ve run it...');
      return false;
    }

    console.log('✅ Column added successfully!\n');
    return true;

  } catch (error) {
    console.log('📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new\n');
    console.log('━'.repeat(70));
    console.log(sql.trim());
    console.log('━'.repeat(70));
    console.log('\nAfter running the SQL, press Enter to continue...');
    return false;
  }
}

addColumn().then(async (success) => {
  if (!success) {
    // Wait for user input
    process.stdin.setRawMode(false);
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  console.log('\n✅ Ready to sync cancel state!\n');
  process.exit(0);
});
