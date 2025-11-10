-- Migration: Implement Email Sending Engine - Part 1
-- This migration adds the necessary database schema for queuing and sending emails.

-- Step 1: Add a status to campaigns to manage their state
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'status'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN status campaign_status DEFAULT 'draft';
    END IF;
END$$;

-- Step 2: Create the email_queue table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
        CREATE TYPE email_status AS ENUM ('queued', 'sending', 'sent', 'failed', 'rescheduled');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS email_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    inbox_id BIGINT REFERENCES inboxes(id) ON DELETE CASCADE NOT NULL,
    sequence_id BIGINT REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
    email_step_id BIGINT REFERENCES email_steps(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    send_at TIMESTAMPTZ NOT NULL,
    status email_status DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_queue_status_send_at_idx ON email_queue(status, send_at);
CREATE INDEX IF NOT EXISTS email_queue_user_id_idx ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS email_queue_campaign_id_idx ON email_queue(campaign_id);
CREATE INDEX IF NOT EXISTS email_queue_inbox_id_idx ON email_queue(inbox_id);

-- Enable RLS for the new table
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_queue
CREATE POLICY "Users can view their own queued emails" 
ON email_queue FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queued emails" 
ON email_queue FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queued emails" 
ON email_queue FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queued emails" 
ON email_queue FOR DELETE 
USING (auth.uid() = user_id);

GRANT ALL ON email_queue TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE email_queue_id_seq TO authenticated;


-- Step 3: Create a function to populate the queue when a campaign starts
CREATE OR REPLACE FUNCTION start_campaign(campaign_id_to_start BIGINT)
RETURNS VOID AS $$
DECLARE
    contact_record RECORD;
    first_step RECORD;
    -- This is a placeholder. In a real app, this would be dynamically generated
    -- per contact, likely by calling the /api/generate-email endpoint from the frontend
    -- before calling this function. For this implementation, we'll use the template from the step.
    personalized_subject TEXT;
    personalized_body TEXT;
    -- Placeholder for sending window (e.g., 9 AM to 5 PM in user's timezone)
    send_window_start TIME := '09:00:00';
    send_window_end TIME := '17:00:00';
    -- Randomized delay between 90 and 300 seconds
    random_delay_seconds INT;
    current_send_time TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Find the first step of the sequence for this campaign
    SELECT es.*
    INTO first_step
    FROM campaigns c
    JOIN sequences s ON c.sequence_id = s.id
    JOIN email_steps es ON es.sequence_id = s.id
    WHERE c.id = campaign_id_to_start
    ORDER BY es.step_number ASC
    LIMIT 1;

    IF first_step IS NULL THEN
        RAISE EXCEPTION 'Campaign % has no email steps in its sequence.', campaign_id_to_start;
    END IF;

    -- 2. Loop through all contacts in the campaign's contact list
    FOR contact_record IN
        SELECT ct.*
        FROM contacts ct
        JOIN campaign_contacts cc ON ct.id = cc.contact_id
        WHERE cc.campaign_id = campaign_id_to_start
    LOOP
        -- 3. Personalize the subject and body (simple find-and-replace for now)
        personalized_subject := REPLACE(first_step.subject, '{{firstName}}', contact_record.first_name);
        personalized_subject := REPLACE(personalized_subject, '{{companyName}}', contact_record.company_name);
        
        personalized_body := REPLACE(first_step.body, '{{firstName}}', contact_record.first_name);
        personalized_body := REPLACE(personalized_body, '{{companyName}}', contact_record.company_name);
        -- Add CAN-SPAM footer
        personalized_body := personalized_body || '\n\n---\nOur Company Inc.\n123 Street, City, State 12345\n<a href="{{unsubscribe_link}}">Unsubscribe</a>';

        -- 4. Calculate the send time with a random delay
        random_delay_seconds := floor(random() * (300 - 90 + 1) + 90);
        current_send_time := current_send_time + (random_delay_seconds * INTERVAL '1 second');

        -- TODO: Add timezone and sending window logic here.
        -- This is a simplified version. A robust implementation would handle user timezones.

        -- 5. Insert into the email queue
        INSERT INTO email_queue (
            user_id,
            campaign_id,
            contact_id,
            inbox_id, -- TODO: Implement inbox rotation/selection logic
            sequence_id,
            email_step_id,
            subject,
            body,
            send_at
        )
        VALUES (
            (SELECT user_id FROM campaigns WHERE id = campaign_id_to_start),
            campaign_id_to_start,
            contact_record.id,
            (SELECT id FROM inboxes WHERE user_id = (SELECT user_id FROM campaigns WHERE id = campaign_id_to_start) LIMIT 1), -- Placeholder: just picks the first inbox
            first_step.sequence_id,
            first_step.id,
            personalized_subject,
            personalized_body,
            current_send_time
        );
    END LOOP;

    -- 6. Update the campaign status to 'active'
    UPDATE campaigns SET status = 'active' WHERE id = campaign_id_to_start;
END;
$$ LANGUAGE plpgsql;
