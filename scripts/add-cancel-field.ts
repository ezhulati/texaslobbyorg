import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addCancelField() {
  try {
    console.log('📝 Adding cancel_at_period_end field to users table...\n');

    // Run the SQL to add the column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

        CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
        ON public.users(cancel_at_period_end)
        WHERE cancel_at_period_end = true;

        COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';
      `
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Successfully added cancel_at_period_end field!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addCancelField();
