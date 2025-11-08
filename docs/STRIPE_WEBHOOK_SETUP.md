# Stripe Webhook Setup Guide

This guide covers setting up Stripe webhooks for production deployment.

## Overview

Webhooks are required for handling subscription lifecycle events (payments, cancellations, updates). The webhook endpoint is located at:

```
POST /api/stripe/webhook
```

## Local Development Setup

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Authenticate with Stripe

```bash
stripe login
```

This will open your browser to authorize the CLI.

### 3. Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:4326/api/stripe/webhook
```

The CLI will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 4. Add Secret to `.env`

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 5. Test the Webhook

```bash
stripe trigger checkout.session.completed
```

## Production Deployment Setup

### 1. Deploy to Netlify

Your webhook endpoint will be available at:
```
https://texaslobby.org/api/stripe/webhook
```

### 2. Configure Webhook in Stripe Dashboard

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter the endpoint URL:
   ```
   https://texaslobby.org/api/stripe/webhook
   ```

4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

5. Click **Add endpoint**

### 3. Get Production Webhook Secret

After creating the endpoint, Stripe will show you the webhook signing secret:
```
whsec_xxxxxxxxxxxxx
```

### 4. Add Secret to Netlify Environment Variables

1. Go to **Netlify Dashboard** → **Site Settings** → **Environment Variables**
2. Add new variable:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxxxxxxxxxx` (from step 3)
3. Click **Save**
4. Redeploy your site for changes to take effect

## Webhook Events

### checkout.session.completed
**Fired when:** Customer completes payment
**Action:**
- Activate subscription in database
- Send confirmation email
- Update lobbyist profile tier

### customer.subscription.updated
**Fired when:** Subscription status changes (renewal, upgrade, downgrade)
**Action:**
- Update subscription status in database
- Downgrade to free if subscription becomes inactive

### customer.subscription.deleted
**Fired when:** Subscription is cancelled or expires
**Action:**
- Downgrade user to free tier
- Send cancellation confirmation email

### invoice.payment_failed
**Fired when:** Subscription payment fails
**Action:**
- Mark subscription as `past_due`
- Send payment failure notification email

## Testing Webhooks

### Stripe CLI Testing

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription update
stripe trigger customer.subscription.updated

# Test subscription deletion
stripe trigger customer.subscription.deleted

# Test payment failure
stripe trigger invoice.payment_failed
```

### Manual Testing with Test Cards

1. Go to `/pricing`
2. Click subscribe button
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify webhook received in Stripe Dashboard → Developers → Webhooks → [Your endpoint] → Events

## Monitoring Webhooks

### Stripe Dashboard
- Go to **Developers** → **Webhooks** → **[Your endpoint]**
- View recent webhook attempts
- See success/failure status
- Retry failed webhooks manually

### Application Logs
Webhook processing is logged to console:
```
[Webhook] Processing checkout.session.completed - Event ID: evt_xxx
[Webhook] Successfully processed checkout.session.completed - Event ID: evt_xxx
```

Check Netlify Function logs for webhook processing details.

## Error Handling

### Retry Logic
Stripe automatically retries failed webhooks with exponential backoff:
- 1 hour after failure
- 2 hours after 1st retry
- 4 hours after 2nd retry
- And so on...

Webhooks are retried for up to **3 days**.

### Idempotency
All webhook handlers should be idempotent (safe to run multiple times).

Current implementation:
- Uses Stripe event IDs for logging
- Database operations are idempotent (upserts)
- Emails may be sent multiple times (acceptable for retries)

### Common Issues

#### Webhook not receiving events
- Check endpoint URL is correct
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Ensure endpoint is publicly accessible (not behind firewall)

#### Signature verification failed
- Wrong webhook secret
- Ensure you're using the production secret for production environment
- Check that raw request body is being passed to `stripe.webhooks.constructEvent()`

#### 500 errors
- Check application logs for error details
- Verify database connection
- Check that Supabase service role key is configured

## Security Best Practices

1. **Always verify webhook signatures** - Already implemented in handler
2. **Use HTTPS in production** - Netlify provides this automatically
3. **Keep webhook secrets secure** - Store in environment variables, never commit to git
4. **Rate limit webhook endpoint** - Netlify handles this automatically
5. **Log all webhook events** - Already implemented for debugging

## Troubleshooting

### Webhook Test Checklist
- [ ] Endpoint URL is correct and publicly accessible
- [ ] Webhook secret matches environment variable
- [ ] All 4 event types are selected in Stripe Dashboard
- [ ] Netlify environment variables are set
- [ ] Site has been redeployed after adding variables

### Debug Steps
1. Check Stripe Dashboard → Webhooks → [Your endpoint] → Recent attempts
2. Click on failed event to see error details
3. Check Netlify Function logs
4. Test locally with Stripe CLI first
5. Retry failed webhook manually from Stripe Dashboard

## Additional Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
