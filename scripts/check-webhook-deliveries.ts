import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function checkWebhookDeliveries() {
  try {
    console.log('🔍 Checking recent webhook deliveries...\n');

    // Get all webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });

    if (endpoints.data.length === 0) {
      console.log('❌ No webhook endpoints found');
      return;
    }

    for (const endpoint of endpoints.data) {
      if (!endpoint.url.includes('texaslobby.org')) continue;

      console.log(`📡 Webhook: ${endpoint.url}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Events: ${endpoint.enabled_events.join(', ')}\n`);

      // Try to get recent events (Note: Stripe API doesn't directly support this,
      // but we can check recent events and see if they match our webhook)
      const events = await stripe.events.list({
        limit: 10,
        type: 'customer.subscription.updated'
      });

      console.log(`📋 Recent subscription.updated events:`);
      if (events.data.length === 0) {
        console.log('   No recent events found\n');
      } else {
        events.data.forEach((event, idx) => {
          const created = new Date(event.created * 1000);
          console.log(`   ${idx + 1}. ${created.toLocaleString()}`);
          console.log(`      Event ID: ${event.id}`);
        });
      }
    }

    console.log('\n💡 To see full webhook delivery logs:');
    console.log('   Visit: https://dashboard.stripe.com/webhooks');
    console.log('   Click on your webhook, then "Recent deliveries"');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWebhookDeliveries();
