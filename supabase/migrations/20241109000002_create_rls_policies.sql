-- Migration: Create Row-Level Security Policies
-- This migration creates comprehensive RLS policies for all tables
-- ensuring users can only access their own data

-- =============================================================================
-- CAMPAIGNS TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own campaigns
CREATE POLICY "Users can view their own campaigns" 
ON campaigns FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert campaigns for themselves
CREATE POLICY "Users can insert their own campaigns" 
ON campaigns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own campaigns
CREATE POLICY "Users can update their own campaigns" 
ON campaigns FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own campaigns
CREATE POLICY "Users can delete their own campaigns" 
ON campaigns FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- CONTACTS TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own contacts
CREATE POLICY "Users can view their own contacts" 
ON contacts FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert contacts for themselves
CREATE POLICY "Users can insert their own contacts" 
ON contacts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own contacts
CREATE POLICY "Users can update their own contacts" 
ON contacts FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own contacts
CREATE POLICY "Users can delete their own contacts" 
ON contacts FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- DOMAINS TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own domains
CREATE POLICY "Users can view their own domains" 
ON domains FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert domains for themselves
CREATE POLICY "Users can insert their own domains" 
ON domains FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own domains
CREATE POLICY "Users can update their own domains" 
ON domains FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own domains
CREATE POLICY "Users can delete their own domains" 
ON domains FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- INBOXES TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own inboxes
CREATE POLICY "Users can view their own inboxes" 
ON inboxes FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert inboxes for themselves
CREATE POLICY "Users can insert their own inboxes" 
ON inboxes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own inboxes
CREATE POLICY "Users can update their own inboxes" 
ON inboxes FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own inboxes
CREATE POLICY "Users can delete their own inboxes" 
ON inboxes FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- SEQUENCES TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own sequences
CREATE POLICY "Users can view their own sequences" 
ON sequences FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert sequences for themselves
CREATE POLICY "Users can insert their own sequences" 
ON sequences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own sequences
CREATE POLICY "Users can update their own sequences" 
ON sequences FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own sequences
CREATE POLICY "Users can delete their own sequences" 
ON sequences FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- EMAIL_STEPS TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own email steps
CREATE POLICY "Users can view their own email_steps" 
ON email_steps FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert email steps for themselves
CREATE POLICY "Users can insert their own email_steps" 
ON email_steps FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own email steps
CREATE POLICY "Users can update their own email_steps" 
ON email_steps FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own email steps
CREATE POLICY "Users can delete their own email_steps" 
ON email_steps FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- REPLIES TABLE POLICIES
-- =============================================================================

-- Policy: Users can view only their own replies
CREATE POLICY "Users can view their own replies" 
ON replies FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert replies for themselves
CREATE POLICY "Users can insert their own replies" 
ON replies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own replies
CREATE POLICY "Users can update their own replies" 
ON replies FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own replies
CREATE POLICY "Users can delete their own replies" 
ON replies FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant authenticated users access to tables
GRANT ALL ON campaigns TO authenticated;
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON domains TO authenticated;
GRANT ALL ON inboxes TO authenticated;
GRANT ALL ON sequences TO authenticated;
GRANT ALL ON email_steps TO authenticated;
GRANT ALL ON replies TO authenticated;

-- Grant usage on sequences (for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
