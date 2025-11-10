-- Migration: Correct RLS Update Policy for Contacts
-- This migration corrects the RLS UPDATE policy for the `contacts` table
-- to allow users to claim unowned contacts (user_id IS NULL) or update their own contacts.

-- Drop the existing UPDATE policies
DROP POLICY IF EXISTS "Users can update only their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own or unowned contacts" ON contacts;

-- Create a new UPDATE policy that allows updating if the user_id is NULL or matches auth.uid()
CREATE POLICY "Users can update their own or unowned contacts" 
ON contacts FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);
