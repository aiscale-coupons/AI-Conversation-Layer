-- Migration: Create Campaign Stats Function
-- This migration creates a PostgreSQL function to calculate detailed statistics for all campaigns.

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
        -- Count of contacts in the campaign
        (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id) as contacts,
        -- Count of emails sent for the campaign
        (SELECT COUNT(*) FROM email_queue eq WHERE eq.campaign_id = c.id AND eq.status = 'sent') as sent,
        -- Open rate (placeholder, as open tracking is not implemented)
        0.0 as open_rate,
        -- Reply rate: (number of replies / number of contacts) * 100
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
    ORDER BY
        c.created_at DESC;
END;
$$ LANGUAGE plpgsql;
