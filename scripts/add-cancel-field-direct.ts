import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addCancelField() {
  try {
    console.log('📝 Adding cancel_at_period_end column to users table...\n');

    // Use raw SQL via Supabase's query function
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

        CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
        ON public.users(cancel_at_period_end)
        WHERE cancel_at_period_end = true;
      `
    });

    if (error) {
      // Try using the REST API POST method instead
      console.log('Trying alternative method...\n');

      const response = await fetch(`${process.env.PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE public.users
            ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
          `
        })
      });

      if (!response.ok) {
        console.log('❌ Cannot add column via API\n');
        console.log('📋 Please run this SQL in Supabase SQL Editor:');
        console.log('─'.repeat(60));
        console.log(`
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
ON public.users(cancel_at_period_end)
WHERE cancel_at_period_end = true;

COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';
        `);
        console.log('─'.repeat(60));
        console.log('\n💡 Go to: https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new');
        return;
      }
    }

    console.log('✅ Successfully added cancel_at_period_end column!');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
    console.log('─'.repeat(60));
    console.log(`
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
ON public.users(cancel_at_period_end)
WHERE cancel_at_period_end = true;

COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';
    `);
    console.log('─'.repeat(60));
    console.log('\n💡 Go to: https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new');
  }
}

addCancelField();
