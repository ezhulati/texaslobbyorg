import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook endpoint...\n');

    // Create a test event
    const subscription = await stripe.subscriptions.retrieve('sub_1SRdPQGXxVTOE0eqveQHuqcM');

    console.log('📡 Sending test webhook event to Stripe...\n');

    // Trigger a test webhook
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 1 });

    if (webhookEndpoints.data.length === 0) {
      console.log('❌ No webhook endpoint found');
      return;
    }

    const endpoint = webhookEndpoints.data[0];

    console.log(`Webhook endpoint: ${endpoint.url}`);
    console.log(`Status: ${endpoint.status}`);
    console.log(`\n💡 To manually test the webhook:`);
    console.log(`   1. Go to: https://dashboard.stripe.com/test/webhooks/${endpoint.id}`);
    console.log(`   2. Click "Send test webhook"`);
    console.log(`   3. Select "customer.subscription.updated"`);
    console.log(`   4. Click "Send test webhook"`);
    console.log(`\n   Then check your database to see if it synced!`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWebhook();
