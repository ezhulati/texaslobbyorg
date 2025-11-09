import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function checkSubscription() {
  try {
    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve('sub_1SRdPQGXxVTOE0eqveQHuqcM');
    
    console.log('Stripe Subscription Details:');
    console.log('Status:', subscription.status);
    console.log('Current period end:', new Date(subscription.current_period_end * 1000));
    console.log('Metadata:', subscription.metadata);
    console.log('\nItems:');
    subscription.items.data.forEach(item => {
      console.log(`  - Price ID: ${item.price.id}`);
      console.log(`    Amount: $${item.price.unit_amount! / 100}/month`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSubscription();
