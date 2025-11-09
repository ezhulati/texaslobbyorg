import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log('🚀 Applying new feature migrations...\n');

  // Read migration files
  const testimonialsMigration = readFileSync(
    join(process.cwd(), 'supabase/migrations/024_add_testimonials.sql'),
    'utf-8'
  );

  const supportTicketsMigration = readFileSync(
    join(process.cwd(), 'supabase/migrations/025_add_support_tickets.sql'),
    'utf-8'
  );

  try {
    console.log('✓ Applying testimonials migration...');
    const { error: testimonialsError } = await supabase.rpc('exec_sql', {
      sql: testimonialsMigration
    });

    if (testimonialsError) {
      console.error('❌ Error applying testimonials migration:', testimonialsError);
      // Continue anyway in case table already exists
    } else {
      console.log('✅ Testimonials migration applied successfully');
    }

    console.log('\n✓ Applying support tickets migration...');
    const { error: ticketsError } = await supabase.rpc('exec_sql', {
      sql: supportTicketsMigration
    });

    if (ticketsError) {
      console.error('❌ Error applying support tickets migration:', ticketsError);
      // Continue anyway in case table already exists
    } else {
      console.log('✅ Support tickets migration applied successfully');
    }

    console.log('\n🎉 All migrations completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applyMigrations();
