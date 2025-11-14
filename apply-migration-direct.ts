// @ts-ignore - pg types not installed, script run outside main build
import pg from 'pg';
import * as fs from 'fs';

const { Client } = pg;

// Construct connection string from Supabase URL
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://ntyzdtqilbxmjbwylfhx.supabase.co';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project reference from Supabase URL');
  process.exit(1);
}

// Direct connection string (not pooler)
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY;
const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

console.log('Connecting to Supabase database...');
console.log('Project:', projectRef);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✓ Connected\n');

    const migrationSQL = fs.readFileSync('supabase/migrations/20251110143151_add_bill_tags_columns.sql', 'utf8');

    console.log('Running migration SQL...\n');
    await client.query(migrationSQL);

    console.log('✓ Migration applied successfully!\n');

    // Verify columns exist
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'bill_tags'
      AND column_name IN ('tag_type', 'is_public', 'notes')
      ORDER BY column_name;
    `);

    console.log('Verified columns:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
