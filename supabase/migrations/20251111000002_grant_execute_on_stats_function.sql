-- Migration: Grant execute on campaign stats function
-- This migration grants execute permission to the 'authenticated' role for the get_campaign_stats function.

GRANT EXECUTE
ON FUNCTION public.get_campaign_stats()
TO authenticated;
