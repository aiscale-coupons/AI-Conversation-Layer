# Supabase Migrations

This directory contains SQL migration files to implement Row-Level Security (RLS) for the AI Conversation Layer application.

## Migration Files

1. **20241109000001_enable_rls_and_auth.sql**: Adds `user_id` columns to all tables and enables RLS
2. **20241109000002_create_rls_policies.sql**: Creates comprehensive RLS policies for all tables

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Apply migrations:
   ```bash
   supabase db push
   ```

### Option 2: Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order:
   - First: `20241109000001_enable_rls_and_auth.sql`
   - Second: `20241109000002_create_rls_policies.sql`
4. Execute each migration

### Option 3: Using Supabase SQL Editor API

You can also run these migrations programmatically using the Supabase Management API.

## What These Migrations Do

### Migration 1: Enable RLS and Auth
- Adds `user_id` (UUID) columns to all tables that reference `auth.users(id)`
- Creates indexes on `user_id` columns for optimal query performance
- Enables Row-Level Security on all application tables
- Sets up CASCADE DELETE to automatically clean up user data when a user is deleted

### Migration 2: Create RLS Policies
- Creates SELECT policies: Users can only view their own data
- Creates INSERT policies: Users can only create records for themselves
- Creates UPDATE policies: Users can only modify their own records
- Creates DELETE policies: Users can only delete their own records
- Grants necessary permissions to authenticated users

## Important Notes

⚠️ **Before Running Migrations:**

1. **Backup your database**: Always create a backup before running migrations
2. **Update existing data**: If you have existing data, you'll need to assign `user_id` values to existing rows:
   ```sql
   -- Example: Assign all existing records to a specific user
   UPDATE campaigns SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
   UPDATE contacts SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
   -- Repeat for all tables
   ```

3. **Update frontend code**: After applying RLS, make sure your frontend code includes `user_id` when inserting records:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   await supabase.from('contacts').insert({ 
     ...contactData, 
     user_id: user.id 
   });
   ```

## Testing RLS Policies

After applying migrations, test that RLS is working correctly:

1. Create two test user accounts
2. Insert data as User A
3. Try to query as User B - you should only see User B's data
4. Try to update/delete User A's data as User B - should be denied

## Rollback

If you need to rollback these migrations:

```sql
-- Drop all RLS policies
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
-- ... repeat for all policies

-- Disable RLS
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Remove user_id columns (optional, will lose data association)
ALTER TABLE campaigns DROP COLUMN IF EXISTS user_id;
-- ... repeat for all tables
```

## Support

For more information on Row-Level Security in Supabase:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
