import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateStripeIds() {
  const email = 'enri@albaniavisit.com';
  const customerId = 'cus_TOQFTzT41hwEai';
  const subscriptionId = 'sub_1SRdPQGXxVTOE0eqveQHuqcM';

  console.log(`Updating Stripe IDs for ${email}...`);

  const { data, error } = await supabase
    .from('users')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq('email', email)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }

  console.log('✅ User updated successfully!');
  console.log('Stripe Customer ID:', data.stripe_customer_id);
  console.log('Stripe Subscription ID:', data.stripe_subscription_id);
}

updateStripeIds();
