import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function setupWebhook() {
  try {
    console.log('🔧 Setting up Stripe webhook...\n');

    // Create webhook endpoint
    const webhook = await stripe.webhookEndpoints.create({
      url: 'https://texaslobby.org/api/stripe/webhook',
      enabled_events: [
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'checkout.session.completed',
        'invoice.payment_failed',
      ],
      description: 'TexasLobby.org subscription webhook',
    });

    console.log('✅ Webhook endpoint created successfully!');
    console.log(`   ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Status: ${webhook.status}`);
    console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
    console.log('\n🔑 WEBHOOK SIGNING SECRET (save this!):');
    console.log(`   ${webhook.secret}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Add this to Netlify environment variables:');
    console.log(`      STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    console.log('   2. Redeploy the site');
    console.log('\n💡 After setup, upgrades/downgrades will sync automatically!');

  } catch (error: any) {
    if (error.code === 'url_invalid') {
      console.error('❌ Error: Invalid URL. Make sure https://texaslobby.org is live.');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

setupWebhook();
