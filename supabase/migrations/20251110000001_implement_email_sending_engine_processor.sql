-- Migration: Implement Email Sending Engine - Part 2
-- This migration creates the core processing function and the cron job.

-- Step 1: Create a table to track daily sending limits
CREATE TABLE IF NOT EXISTS inbox_daily_send_counts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    inbox_id BIGINT REFERENCES inboxes(id) ON DELETE CASCADE NOT NULL,
    send_date DATE NOT NULL,
    send_count INT DEFAULT 0,
    UNIQUE(inbox_id, send_date)
);

-- Enable RLS
ALTER TABLE inbox_daily_send_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own send counts"
ON inbox_daily_send_counts
USING (auth.uid() = user_id);

GRANT ALL ON inbox_daily_send_counts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inbox_daily_send_counts_id_seq TO authenticated;


-- Step 2: Create the core queue processing function
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS TABLE (
    queue_id BIGINT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    email_to_send RECORD;
    inbox_record RECORD;
    contact_record RECORD;
    -- Configurable limits
    daily_limit_per_inbox INT := 40;
    batch_size INT := 10; -- Number of emails to process per run
    current_send_count INT;
    -- Supabase Edge Function URL
    edge_function_url TEXT := 'https://ypxntquggvgjbukgzkjw.supabase.co/functions/v1/send-email-worker';
    -- We need a service role key to invoke functions from postgres
    -- It's recommended to store this in a secure way, e.g., using Supabase secrets
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweG50cXVnZ3ZnamJ1a2d6a2p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQzNzgxOSwiZXhwIjoyMDc4MDEzODE5fQ.kzK3c-hBxlgr9XP8RQPijDWy9cLXbW4RzAn9FraQgRE'; 
BEGIN
    -- Loop through emails that are ready to be sent
    FOR email_to_send IN
        SELECT *
        FROM email_queue
        WHERE status = 'queued' AND send_at <= NOW()
        ORDER BY send_at ASC
        LIMIT batch_size
    LOOP
        -- 1. Get inbox and contact details
        SELECT * INTO inbox_record FROM inboxes WHERE id = email_to_send.inbox_id;
        SELECT * INTO contact_record FROM contacts WHERE id = email_to_send.contact_id;

        -- 2. Check daily send limit for the inbox
        SELECT send_count INTO current_send_count
        FROM inbox_daily_send_counts
        WHERE inbox_id = email_to_send.inbox_id AND send_date = CURRENT_DATE;

        IF current_send_count IS NULL THEN
            current_send_count := 0;
        END IF;

        IF current_send_count >= daily_limit_per_inbox THEN
            -- Reschedule for the next day
            UPDATE email_queue
            SET 
                status = 'rescheduled',
                send_at = send_at + INTERVAL '1 day',
                updated_at = NOW()
            WHERE id = email_to_send.id;
            
            -- Return status and continue to next email
            queue_id := email_to_send.id;
            status := 'rescheduled';
            message := 'Daily limit reached';
            RETURN NEXT;
            CONTINUE;
        END IF;

        -- 3. Mark the email as 'sending' to prevent double-sends
        UPDATE email_queue SET status = 'sending', updated_at = NOW() WHERE id = email_to_send.id;

        -- 4. Invoke the Edge Function to send the email
        DECLARE
            response_body JSONB;
            error_message TEXT;
        BEGIN
            SELECT content INTO response_body
            FROM supabase.net.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_role_key
                ),
                body := jsonb_build_object(
                    'inbox_email', inbox_record.email,
                    'access_token', inbox_record.access_token, -- Assuming you store this securely
                    'contact_email', contact_record.email,
                    'subject', email_to_send.subject,
                    'body', email_to_send.body
                )
            );

            -- 5. Update status based on response
            UPDATE email_queue SET status = 'sent', updated_at = NOW() WHERE id = email_to_send.id;

            -- 6. Increment the daily send count
            INSERT INTO inbox_daily_send_counts (user_id, inbox_id, send_date, send_count)
            VALUES (email_to_send.user_id, email_to_send.inbox_id, CURRENT_DATE, 1)
            ON CONFLICT (inbox_id, send_date)
            DO UPDATE SET send_count = inbox_daily_send_counts.send_count + 1;

            queue_id := email_to_send.id;
            status := 'sent';
            message := 'Email sent successfully';
            RETURN NEXT;

        EXCEPTION
            WHEN OTHERS THEN
                GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
                UPDATE email_queue
                SET 
                    status = 'failed',
                    error_message = 'Edge function error: ' || error_message,
                    updated_at = NOW()
                WHERE id = email_to_send.id;

                queue_id := email_to_send.id;
                status := 'failed';
                message := 'Failed to send email: ' || error_message;
                RETURN NEXT;
        END;

    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- Step 3: Schedule the cron job to run every minute
-- Make sure the pg_cron extension is enabled in your Supabase project.
SELECT cron.schedule(
    'process-email-queue-job',
    '* * * * *', -- Every minute
    $$ SELECT * FROM process_email_queue(); $$
);

-- To unschedule the job:
-- SELECT cron.unschedule('process-email-queue-job');
