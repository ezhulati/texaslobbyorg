#!/bin/bash

# Get Supabase connection string
echo "Applying migrations directly to database..."

# Apply testimonials migration
echo "Creating testimonials table..."
cat supabase/migrations/024_add_testimonials.sql | npx supabase db execute - --linked

# Apply support tickets migration
echo "Creating support tickets tables..."
cat supabase/migrations/025_add_support_tickets.sql | npx supabase db execute - --linked

echo "Done!"
