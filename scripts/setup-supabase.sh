#!/bin/bash

# TexasLobby.org - Supabase Setup Script
# This script sets up your Supabase database with all migrations and seed data

set -e  # Exit on error

echo "=== TexasLobby.org Supabase Setup ==="
echo ""

# Check if we have required environment variables
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "❌ Error: SUPABASE_PROJECT_REF not set"
    echo ""
    echo "Please set your environment variables:"
    echo "  export SUPABASE_PROJECT_REF=your-project-ref"
    echo "  export SUPABASE_DB_PASSWORD=your-database-password"
    echo ""
    echo "You can find these in your Supabase dashboard:"
    echo "  Project Ref: Settings > General > Reference ID"
    echo "  DB Password: Settings > Database > Connection string"
    exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "❌ Error: SUPABASE_DB_PASSWORD not set"
    exit 1
fi

# Link to project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref "$SUPABASE_PROJECT_REF"

# Run migrations
echo "📦 Running database migrations..."
supabase db push

# Check if we should seed data
read -p "Do you want to seed the database with sample cities and subjects? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."

    # Connect to database and run seed file
    DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

    # Use psql if available, otherwise use supabase db execute
    if command -v psql &> /dev/null; then
        psql "$DB_URL" -f supabase/seed.sql
    else
        # Fall back to reading and executing via supabase CLI
        cat supabase/seed.sql | supabase db execute
    fi

    echo "✅ Database seeded successfully!"
else
    echo "⏭️  Skipping seed data"
fi

echo ""
echo "✅ Supabase setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update your .env file with Supabase credentials"
echo "  2. Run: npm run dev"
echo "  3. Visit: http://localhost:4321"
echo ""
