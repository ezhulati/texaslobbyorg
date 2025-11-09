import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('Checking database tables...\n');

  // Check testimonials table
  const { data: testimonialsTest, error: testimonialsError } = await supabase
    .from('testimonials')
    .select('id')
    .limit(1);

  console.log('✓ testimonials table:', testimonialsError ? '❌ NOT FOUND' : '✅ EXISTS');
  if (testimonialsError) console.log('  Error:', testimonialsError.message);

  // Check support_tickets table
  const { data: ticketsTest, error: ticketsError } = await supabase
    .from('support_tickets')
    .select('id')
    .limit(1);

  console.log('✓ support_tickets table:', ticketsError ? '❌ NOT FOUND' : '✅ EXISTS');
  if (ticketsError) console.log('  Error:', ticketsError.message);

  // Check support_ticket_messages table
  const { data: messagesTest, error: messagesError } = await supabase
    .from('support_ticket_messages')
    .select('id')
    .limit(1);

  console.log('✓ support_ticket_messages table:', messagesError ? '❌ NOT FOUND' : '✅ EXISTS');
  if (messagesError) console.log('  Error:', messagesError.message);

  console.log('\n✓ Existing tables check:');

  // Check existing tables
  const { data: lobbyistsTest, error: lobbyistsError } = await supabase
    .from('lobbyists')
    .select('id')
    .limit(1);

  console.log('  lobbyists table:', lobbyistsError ? '❌ ERROR' : '✅ EXISTS');

  const { data: usersTest, error: usersError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  console.log('  users table:', usersError ? '❌ ERROR' : '✅ EXISTS');
}

checkTables().catch(console.error);
