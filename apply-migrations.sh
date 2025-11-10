#!/bin/bash

# Apply database migrations to Supabase production database

echo "🚀 Applying database migrations to Supabase..."
echo ""

# Get database URL from environment
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable not set"
  echo "You need to set your Supabase connection string:"
  echo "export DATABASE_URL='postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres'"
  exit 1
fi

echo "📄 Applying migration 024_add_testimonials.sql..."
psql "$DATABASE_URL" -f supabase/migrations/024_add_testimonials.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration 024 applied successfully"
else
  echo "❌ Migration 024 failed"
  exit 1
fi

echo ""
echo "📄 Applying migration 025_add_support_tickets.sql..."
psql "$DATABASE_URL" -f supabase/migrations/025_add_support_tickets.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration 025 applied successfully"
else
  echo "❌ Migration 025 failed"
  exit 1
fi

echo ""
echo "🎉 All migrations applied successfully!"
echo ""
echo "Verifying tables..."
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('testimonials', 'support_tickets', 'support_ticket_messages');"
