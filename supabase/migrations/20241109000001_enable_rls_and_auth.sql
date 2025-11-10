-- Migration: Enable RLS and add user_id columns to all tables
-- This migration prepares tables for Row-Level Security by adding user_id columns
-- and enabling RLS on all application tables

-- Add user_id column to campaigns table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Set a default user_id for existing rows (you'll need to update this manually)
        -- UPDATE campaigns SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    END IF;
END $$;

-- Add user_id column to contacts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE contacts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to domains table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE domains ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to inboxes table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inboxes' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE inboxes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to sequences table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sequences' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE sequences ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to email_steps table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_steps' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE email_steps ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to replies table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'replies' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE replies ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes on user_id columns for better query performance
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);
CREATE INDEX IF NOT EXISTS domains_user_id_idx ON domains(user_id);
CREATE INDEX IF NOT EXISTS inboxes_user_id_idx ON inboxes(user_id);
CREATE INDEX IF NOT EXISTS sequences_user_id_idx ON sequences(user_id);
CREATE INDEX IF NOT EXISTS email_steps_user_id_idx ON email_steps(user_id);
CREATE INDEX IF NOT EXISTS replies_user_id_idx ON replies(user_id);

-- Enable Row-Level Security on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE inboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
