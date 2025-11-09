import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function checkWebhooks() {
  try {
    console.log('🔍 Checking Stripe webhook configuration...\n');

    // List all webhooks
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });

    if (endpoints.data.length === 0) {
      console.log('❌ NO WEBHOOKS CONFIGURED!');
      console.log('\n💡 You need to set up a webhook endpoint in Stripe:');
      console.log('   1. Go to https://dashboard.stripe.com/webhooks');
      console.log('   2. Click "Add endpoint"');
      console.log('   3. URL: https://texaslobby.org/api/stripe/webhook');
      console.log('   4. Events to listen to:');
      console.log('      - customer.subscription.updated');
      console.log('      - customer.subscription.deleted');
      console.log('      - checkout.session.completed');
      console.log('      - invoice.payment_failed');
      return;
    }

    console.log(`✅ Found ${endpoints.data.length} webhook(s):\n`);

    endpoints.data.forEach((endpoint, index) => {
      console.log(`Webhook ${index + 1}:`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Events: ${endpoint.enabled_events.join(', ')}`);
      console.log('');
    });

    // Check for the specific webhook we need
    const ourWebhook = endpoints.data.find(e =>
      e.url.includes('texaslobby.org/api/stripe/webhook')
    );

    if (!ourWebhook) {
      console.log('⚠️  No webhook found for texaslobby.org/api/stripe/webhook');
    } else if (!ourWebhook.enabled_events.includes('customer.subscription.updated')) {
      console.log('⚠️  Webhook missing "customer.subscription.updated" event!');
    } else {
      console.log('✅ Webhook is properly configured for subscription updates');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWebhooks();
