import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function retryWebhook() {
  try {
    console.log('🔄 Looking for recent subscription.updated events...\n');

    // Get recent subscription update events
    const events = await stripe.events.list({
      limit: 5,
      type: 'customer.subscription.updated'
    });

    if (events.data.length === 0) {
      console.log('❌ No recent subscription.updated events found');
      console.log('\n💡 This means Stripe hasn\'t sent any webhook events yet.');
      console.log('   Webhooks are only sent for FUTURE changes after the endpoint was created.');
      return;
    }

    console.log(`Found ${events.data.length} recent subscription.updated events:\n`);

    events.data.forEach((event, idx) => {
      const created = new Date(event.created * 1000);
      const subscription = event.data.object as Stripe.Subscription;
      const price = subscription.items.data[0]?.price;

      console.log(`${idx + 1}. ${created.toLocaleString()}`);
      console.log(`   Event ID: ${event.id}`);
      console.log(`   Subscription: ${subscription.id}`);
      if (price) {
        console.log(`   Price: $${price.unit_amount! / 100}/month`);
      }
      console.log('');
    });

    console.log('💡 The webhook was created AFTER these events occurred.');
    console.log('   Try upgrading/downgrading again NOW to test the webhook.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

retryWebhook();
