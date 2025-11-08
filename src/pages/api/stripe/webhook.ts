import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import {
  sendEmail,
  subscriptionConfirmationEmail,
  subscriptionCancelledEmail,
  paymentFailedEmail,
} from '@/lib/email';

/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe:
 * - checkout.session.completed: Initial subscription creation
 * - customer.subscription.updated: Subscription changes (upgrade/downgrade)
 * - customer.subscription.deleted: Subscription cancellation
 *
 * IMPORTANT: This endpoint must be configured in Stripe Dashboard
 * Webhook URL: https://texaslobby.org/api/stripe/webhook
 */
export const POST: APIRoute = async ({ request }) => {
  const supabase = createServerClient();

  // Get the webhook secret from environment
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get the raw body and signature
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 400 }
    );
  }

  console.log(`Received webhook event: ${event.type}`);

  // Handle different event types with retry logic
  try {
    // Log webhook event for debugging
    console.log(`[Webhook] Processing ${event.type} - Event ID: ${event.id}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, supabase, event.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase, event.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase, event.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase, event.id);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    console.log(`[Webhook] Successfully processed ${event.type} - Event ID: ${event.id}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type} - Event ID: ${event.id}:`, error);

    // Return 500 so Stripe will retry
    // Stripe will retry failed webhooks automatically with exponential backoff
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        eventId: event.id,
        eventType: event.type,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Handle successful checkout session
 * This fires when a customer completes payment
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  eventId: string
) {
  const userId = session.client_reference_id;
  const subscriptionId = session.subscription as string;
  const tier = session.metadata?.tier as 'premium' | 'featured';

  if (!userId || !subscriptionId || !tier) {
    console.error('Missing required data in checkout session:', { userId, subscriptionId, tier });
    return;
  }

  console.log(`Checkout completed for user ${userId}, tier: ${tier}`);

  // Get the subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update user's subscription in database
  const { error: userError } = await supabase
    .from('users')
    .update({
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscriptionId,
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId);

  if (userError) {
    console.error('Error updating user subscription:', userError);
    throw userError;
  }

  // Update lobbyist profile tier
  const { error: lobbyistError } = await supabase
    .from('lobbyists')
    .update({
      subscription_tier: tier,
    })
    .eq('user_id', userId);

  if (lobbyistError) {
    console.error('Error updating lobbyist tier:', lobbyistError);
    // Don't throw - user update succeeded, lobbyist update is secondary
  }

  console.log(`Successfully activated ${tier} subscription for user ${userId}`);

  // Send confirmation email
  const { data: user, error: userFetchError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!userFetchError && user) {
    const tierData = SUBSCRIPTION_TIERS[tier];
    const emailTemplate = subscriptionConfirmationEmail(
      user.full_name || 'there',
      tier,
      tierData.price
    );
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });
    console.log(`Sent subscription confirmation email to ${user.email}`);
  }
}

/**
 * Handle subscription updates
 * This fires when subscription changes (upgrade/downgrade, renewal, etc.)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier as 'premium' | 'featured';

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);

  // Update user's subscription status
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      subscription_tier: tier,
    })
    .eq('id', userId);

  if (userError) {
    console.error('Error updating user subscription status:', userError);
    throw userError;
  }

  // If subscription is no longer active, downgrade lobbyist to free
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    const { error: lobbyistError } = await supabase
      .from('lobbyists')
      .update({
        subscription_tier: 'free',
      })
      .eq('user_id', userId);

    if (lobbyistError) {
      console.error('Error downgrading lobbyist tier:', lobbyistError);
    }
  }

  console.log(`Successfully updated subscription for user ${userId}`);
}

/**
 * Handle subscription cancellation
 * This fires when a subscription is cancelled or expires
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  console.log(`Subscription cancelled for user ${userId}`);

  // Update user to free tier
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      subscription_current_period_end: null,
    })
    .eq('id', userId);

  if (userError) {
    console.error('Error cancelling user subscription:', userError);
    throw userError;
  }

  // Downgrade lobbyist profile to free
  const { error: lobbyistError } = await supabase
    .from('lobbyists')
    .update({
      subscription_tier: 'free',
    })
    .eq('user_id', userId);

  if (lobbyistError) {
    console.error('Error downgrading lobbyist to free:', lobbyistError);
  }

  console.log(`Successfully cancelled subscription for user ${userId}`);

  // Send cancellation confirmation email
  const { data: user, error: userFetchError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!userFetchError && user) {
    const tier = subscription.metadata?.tier as 'premium' | 'featured';
    const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const emailTemplate = subscriptionCancelledEmail(
      user.full_name || 'there',
      tier,
      endDate
    );
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });
    console.log(`Sent cancellation confirmation email to ${user.email}`);
  }
}

/**
 * Handle failed payment
 * This fires when a subscription payment fails
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any,
  eventId: string
) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  // Get subscription to find user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  console.log(`Payment failed for user ${userId}`);

  // Update subscription status
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating payment status:', error);
  }

  // Send payment failure email
  const { data: user, error: userFetchError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!userFetchError && user) {
    const tier = subscription.metadata?.tier as 'premium' | 'featured';
    const emailTemplate = paymentFailedEmail(
      user.full_name || 'there',
      tier
    );
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });
    console.log(`Sent payment failed email to ${user.email}`);
  }
}
