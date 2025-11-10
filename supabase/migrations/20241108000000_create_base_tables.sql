-- Migration: Create Base Tables
-- This migration creates the initial set of core tables for the AI Conversation Layer application.

-- Table: campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sequence_id BIGINT,
    contact_list_id BIGINT, -- Assuming a contact_lists table or similar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: contacts
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    company_name TEXT,
    industry TEXT,
    city TEXT,
    pain_point_signal TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for campaigns and contacts (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_contacts (
    campaign_id BIGINT REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, contact_id)
);

-- Table: domains
CREATE TABLE IF NOT EXISTS domains (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL UNIQUE,
    spf_record TEXT,
    dkim_record TEXT,
    dmarc_record TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: inboxes
CREATE TABLE IF NOT EXISTS inboxes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain_id BIGINT REFERENCES domains(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    access_token TEXT, -- Stored securely, ideally encrypted
    refresh_token TEXT, -- Stored securely, ideally encrypted
    is_connected BOOLEAN DEFAULT FALSE,
    daily_send_limit INT DEFAULT 40,
    timezone TEXT, -- e.g., 'America/New_York'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sequences
CREATE TABLE IF NOT EXISTS sequences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: email_steps
CREATE TABLE IF NOT EXISTS email_steps (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sequence_id BIGINT REFERENCES sequences(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    send_delay_days INT DEFAULT 0, -- Delay after previous step
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sequence_id, step_number)
);

-- Table: replies
CREATE TABLE IF NOT EXISTS replies (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_queue_id BIGINT, -- References the sent email
    contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    inbox_id BIGINT REFERENCES inboxes(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    intent TEXT, -- e.g., 'Positive', 'Objection', 'Opt-out'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
