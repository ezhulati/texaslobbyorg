import type { Handler, HandlerEvent } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];

  if (!sig) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing stripe-signature header' }),
    };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        // Get metadata
        const lobbyistId = session.metadata?.lobbyistId;
        const tier = session.metadata?.tier as 'premium' | 'featured';

        if (!lobbyistId || !tier) {
          console.error('Missing metadata in session:', session.id);
          break;
        }

        // Update lobbyist subscription
        const { error } = await supabase
          .from('lobbyists')
          .update({
            subscription_tier: tier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_started_at: new Date().toISOString(),
          })
          .eq('id', lobbyistId);

        if (error) {
          console.error('Error updating lobbyist:', error);
        } else {
          console.log(`Successfully upgraded lobbyist ${lobbyistId} to ${tier}`);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        // Find lobbyist by subscription ID
        const { data: lobbyist, error: fetchError } = await supabase
          .from('lobbyists')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (fetchError || !lobbyist) {
          console.error('Lobbyist not found for subscription:', subscription.id);
          break;
        }

        // Check if subscription is canceled or past_due
        if (subscription.status === 'canceled' || subscription.status === 'past_due') {
          const { error } = await supabase
            .from('lobbyists')
            .update({
              subscription_tier: 'free',
              subscription_ends_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
            })
            .eq('id', lobbyist.id);

          if (error) {
            console.error('Error downgrading lobbyist:', error);
          } else {
            console.log(`Downgraded lobbyist ${lobbyist.id} to free`);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);

        // Find lobbyist by subscription ID
        const { data: lobbyist, error: fetchError } = await supabase
          .from('lobbyists')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (fetchError || !lobbyist) {
          console.error('Lobbyist not found for subscription:', subscription.id);
          break;
        }

        // Downgrade to free
        const { error } = await supabase
          .from('lobbyists')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
            subscription_ends_at: new Date().toISOString(),
          })
          .eq('id', lobbyist.id);

        if (error) {
          console.error('Error downgrading lobbyist:', error);
        } else {
          console.log(`Downgraded lobbyist ${lobbyist.id} to free after deletion`);
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);

        // Could send email notification here
        // For now, Stripe will handle retry logic

        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error: any) {
    console.error('Error processing webhook:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message,
      }),
    };
  }
};
