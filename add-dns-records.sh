#!/bin/bash

# Get Netlify access token from environment or prompt
if [ -z "$NETLIFY_AUTH_TOKEN" ]; then
  echo "Error: Please set NETLIFY_AUTH_TOKEN environment variable"
  echo "You can get your token from: https://app.netlify.com/user/applications"
  exit 1
fi

ZONE_ID="67c946f6cd6825cbde668d7b"
API_BASE="https://api.netlify.com/api/v1"

echo "Adding Resend DNS records to Netlify..."
echo ""

# 1. Domain Verification TXT Record
echo "1. Adding domain verification TXT record..."
curl -X POST "$API_BASE/dns_zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TXT",
    "hostname": "resend._domainkey",
    "value": "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCkU5xevFXB1lV/y1e5aOWr5M+HqPZ8ljz7nLUgTnRacWdpqVvFspy5v5MxQt0QWXQrpgORMrEbxFku0t1voYA+3OcNDKSAvk5NJ9475t/vOWdGo6D3TWxckXZSM4e7WXX7QbMgYMjQ19Kv5MyZe+T+kEcmANHLm02szUe7Kzz0RQIDAQAB",
    "ttl": 3600
  }'

echo ""

# 2. MX Record for Sending
echo "2. Adding MX record for sending..."
curl -X POST "$API_BASE/dns_zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MX",
    "hostname": "send",
    "value": "feedback-smtp.us-east-1.amazonses.com",
    "ttl": 3600,
    "priority": 10
  }'

echo ""

# 3. SPF TXT Record
echo "3. Adding SPF TXT record..."
curl -X POST "$API_BASE/dns_zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TXT",
    "hostname": "send",
    "value": "v=spf1 include:amazonses.com ~all",
    "ttl": 3600
  }'

echo ""

# 4. DMARC TXT Record
echo "4. Adding DMARC TXT record..."
curl -X POST "$API_BASE/dns_zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TXT",
    "hostname": "_dmarc",
    "value": "v=DMARC1; p=none;",
    "ttl": 3600
  }'

echo ""

# 5. MX Record for Receiving
echo "5. Adding MX record for receiving..."
curl -X POST "$API_BASE/dns_zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MX",
    "hostname": "",
    "value": "inbound-smtp.us-east-1.amazonaws.com",
    "ttl": 3600,
    "priority": 10
  }'

echo ""
echo "✓ Done! All DNS records have been added."
