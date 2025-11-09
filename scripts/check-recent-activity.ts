import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function checkActivity() {
  try {
    // Check recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      customer: 'cus_TOQFTzT41hwEai',
      limit: 5,
    });

    console.log('Recent Checkout Sessions:');
    sessions.data.forEach(session => {
      const created = new Date(session.created * 1000);
      console.log(`\n- Created: ${created.toLocaleString()}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Metadata:`, session.metadata);
      console.log(`  Payment status: ${session.payment_status}`);
    });

    // Check recent subscriptions
    const subs = await stripe.subscriptions.list({
      customer: 'cus_TOQFTzT41hwEai',
      limit: 5,
    });

    console.log('\n\nAll Subscriptions:');
    subs.data.forEach(sub => {
      console.log(`\n- ID: ${sub.id}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Metadata:`, sub.metadata);
      sub.items.data.forEach(item => {
        console.log(`  Price: ${item.price.id} - $${item.price.unit_amount! / 100}`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkActivity();
