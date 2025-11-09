import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function checkWebhookDeliveries() {
  try {
    console.log('🔍 Checking webhook delivery status...\n');

    // Get webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });

    if (endpoints.data.length === 0) {
      console.log('❌ No webhook endpoints configured');
      return;
    }

    const ourEndpoint = endpoints.data.find(e =>
      e.url.includes('texaslobby.org/api/stripe/webhook')
    );

    if (!ourEndpoint) {
      console.log('❌ No webhook found for texaslobby.org');
      return;
    }

    console.log(`✅ Webhook Endpoint Found:`);
    console.log(`   ID: ${ourEndpoint.id}`);
    console.log(`   URL: ${ourEndpoint.url}`);
    console.log(`   Status: ${ourEndpoint.status}`);
    console.log(`   Created: ${new Date(ourEndpoint.created * 1000).toLocaleString()}`);
    console.log(`\n📡 Listening for events:`);
    ourEndpoint.enabled_events.forEach(event => {
      console.log(`   - ${event}`);
    });

    // Get recent events that should have been sent to this webhook
    console.log(`\n📊 Recent subscription.updated events (last 5):`);
    const events = await stripe.events.list({
      limit: 5,
      type: 'customer.subscription.updated',
    });

    if (events.data.length === 0) {
      console.log('   No events found');
    } else {
      events.data.forEach((event, idx) => {
        const eventTime = new Date(event.created * 1000);
        const webhookTime = new Date(ourEndpoint.created * 1000);
        const wasAfterWebhook = event.created > ourEndpoint.created;

        console.log(`\n   ${idx + 1}. ${eventTime.toLocaleString()}`);
        console.log(`      Event ID: ${event.id}`);
        console.log(`      Should webhook receive? ${wasAfterWebhook ? '✅ YES' : '❌ NO (before webhook created)'}`);
      });
    }

    console.log('\n\n💡 To see actual delivery attempts:');
    console.log(`   Visit: https://dashboard.stripe.com/test/webhooks/${ourEndpoint.id}`);
    console.log(`   Look for "Recent deliveries" section`);
    console.log('\n   If deliveries are failing, you\'ll see error messages there.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWebhookDeliveries();
