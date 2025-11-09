import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function getCustomer() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/get-stripe-customer.ts <email>');
    process.exit(1);
  }

  console.log(`Looking up Stripe customer for ${email}...`);

  const customers = await stripe.customers.list({
    email,
    limit: 10,
  });

  if (customers.data.length === 0) {
    console.log('No customer found');
    return;
  }

  console.log('\nFound customers:');
  customers.data.forEach((customer, index) => {
    console.log(`\nCustomer ${index + 1}:`);
    console.log(`  ID: ${customer.id}`);
    console.log(`  Email: ${customer.email}`);
    console.log(`  Created: ${new Date(customer.created * 1000).toLocaleString()}`);
  });

  // Get subscriptions for the first customer
  if (customers.data[0]) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 10,
    });

    console.log(`\nSubscriptions for ${customers.data[0].id}:`);
    subscriptions.data.forEach((sub, index) => {
      console.log(`\nSubscription ${index + 1}:`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Current period end: ${new Date(sub.current_period_end * 1000).toLocaleString()}`);
      console.log(`  Metadata:`, sub.metadata);
    });
  }
}

getCustomer();
