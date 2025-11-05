# Stripe Integration Setup Guide

This guide will help you set up Stripe for payment processing on TexasLobby.org.

## Prerequisites

- Stripe account (create one at [https://stripe.com](https://stripe.com))
- Access to your Stripe Dashboard
- Stripe CLI installed (for webhook testing)

## Step 1: Get Your API Keys

1. Go to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. Add them to your `.env` file:

```env
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Step 2: Create Products and Prices

### Create Premium Product ($297/month)

1. Go to [https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Fill in:
   - **Name**: TexasLobby Premium
   - **Description**: Enhanced visibility and features for lobbyists
   - **Pricing**:
     - One time or recurring: **Recurring**
     - Price: **$297**
     - Billing period: **Monthly**
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`)
6. Add to `.env`:

```env
STRIPE_PREMIUM_PRICE_ID=price_...
```

### Create Featured Product ($597/month)

1. Click "Add product" again
2. Fill in:
   - **Name**: TexasLobby Featured
   - **Description**: Maximum exposure and premium features
   - **Pricing**:
     - One time or recurring: **Recurring**
     - Price: **$597**
     - Billing period: **Monthly**
3. Click "Save product"
4. Copy the **Price ID**
5. Add to `.env`:

```env
STRIPE_FEATURED_PRICE_ID=price_...
```

## Step 3: Set Up Webhook (for Production)

### Option A: Using Stripe CLI (for Development)

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`)

5. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Option B: Production Webhook Endpoint

1. Go to [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://texaslobby.org/.netlify/functions/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret**
7. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 4: Test the Integration

### Test Checkout Flow

1. Start your local development server:
   ```bash
   npm run dev
   ```

2. If using Stripe CLI for webhooks, start listening:
   ```bash
   stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook
   ```

3. Sign in to your account and go to `/upgrade`

4. Click "Upgrade to Premium" or "Upgrade to Featured"

5. Use Stripe test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

6. Complete the checkout

7. Verify:
   - You're redirected to dashboard with success message
   - Your tier is updated in the database
   - Webhook was received (check Stripe CLI output or dashboard)

## Step 5: Verify Database Updates

After successful payment, check your Supabase database:

```sql
SELECT
  first_name,
  last_name,
  subscription_tier,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_started_at
FROM lobbyists
WHERE subscription_tier IN ('premium', 'featured');
```

## Troubleshooting

### Webhook Not Receiving Events

- Check that Stripe CLI is running (for development)
- Verify webhook secret is correct in `.env`
- Check Netlify function logs for errors
- Ensure webhook URL is accessible (for production)

### Checkout Session Fails

- Verify API keys are correct
- Check that Price IDs match your Stripe products
- Ensure `.env` file is loaded properly
- Check browser console and network tab for errors

### Subscription Not Updating

- Check webhook logs in Stripe Dashboard
- Verify Supabase service role key has write permissions
- Check lobbyist ID is being passed correctly
- Review Netlify function logs

## Testing Subscription Lifecycle

### Test Successful Payment

```bash
# Use test card: 4242 4242 4242 4242
```

### Test Failed Payment

```bash
# Use test card: 4000 0000 0000 0002
```

### Test Subscription Cancellation

1. Go to Stripe Dashboard > Customers
2. Find the test customer
3. Click on their subscription
4. Click "Cancel subscription"
5. Verify tier reverts to "free" in database

## Going Live (Production)

1. Switch from test keys to live keys in `.env`
2. Create live products and prices in Stripe Dashboard (live mode)
3. Update Price IDs in `.env`
4. Set up production webhook endpoint
5. Test with live mode test card first
6. Enable live payments

## Additional Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

## Support

If you encounter issues, check:
1. Stripe Dashboard > Developers > Events (for webhook events)
2. Netlify function logs (for server errors)
3. Browser console (for client errors)
4. Supabase logs (for database errors)
