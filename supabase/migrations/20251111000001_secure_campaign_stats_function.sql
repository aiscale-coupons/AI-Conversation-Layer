-- Migration: Secure Campaign Stats Function
-- This migration updates the get_campaign_stats function to bypass RLS by using SECURITY DEFINER.

CREATE OR REPLACE FUNCTION get_campaign_stats()
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    status campaign_status,
    contacts BIGINT,
    sent BIGINT,
    open_rate NUMERIC,
    reply_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.status,
        (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id) as contacts,
        (SELECT COUNT(*) FROM email_queue eq WHERE eq.campaign_id = c.id AND eq.status = 'sent') as sent,
        0.0 as open_rate,
        (
            SELECT 
                CASE 
                    WHEN (SELECT COUNT(*) FROM campaign_contacts cc_inner WHERE cc_inner.campaign_id = c.id) > 0 
                    THEN (
                        (SELECT COUNT(DISTINCT r.contact_id)::NUMERIC FROM replies r WHERE r.campaign_id = c.id) / 
                        (SELECT COUNT(*)::NUMERIC FROM campaign_contacts cc_inner WHERE cc_inner.campaign_id = c.id)
                    ) * 100
                    ELSE 0 
                END
        ) as reply_rate
    FROM
        campaigns c
    WHERE
        c.user_id = auth.uid() -- Added RLS check
    ORDER BY
        c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the search path to the public schema
ALTER FUNCTION get_campaign_stats() SET search_path = public;
