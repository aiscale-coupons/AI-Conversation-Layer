// Supabase Edge Function: send-email-worker
// This function sends an email using the Google Workspace API and manages OAuth tokens.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

// Function to refresh an expired access token
async function refreshAccessToken(refreshToken: string) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error refreshing access token:", errorData);
    throw new Error("Failed to refresh access token.");
  }

  const { access_token, expires_in } = await response.json();
  const expires_at = new Date(Date.now() + expires_in * 1000);

  return { newAccessToken: access_token, newExpiresAt: expires_at };
}

// Function to send an email using the Gmail API
async function sendEmailWithGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  body: string
) {
  const rawEmail = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ].join("\n");

  const base64EncodedEmail = btoa(rawEmail).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: base64EncodedEmail,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error sending email via Gmail API:", errorData);
    throw new Error(`Gmail API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const {
      inbox_id,
      contact_email,
      subject,
      body,
    } = await req.json();

    if (!inbox_id || !contact_email || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch inbox credentials
    const { data: inbox, error: fetchError } = await supabase
      .from("inboxes")
      .select("email, access_token, refresh_token, expires_at")
      .eq("id", inbox_id)
      .single();

    if (fetchError || !inbox) {
      throw new Error(`Could not find inbox with ID ${inbox_id}.`);
    }

    let { access_token, refresh_token, expires_at } = inbox;
    const expiresAtDate = new Date(expires_at);

    // 2. Check if token is expired and refresh if needed
    if (new Date() > expiresAtDate) {
      if (!refresh_token) {
        throw new Error("Access token expired and no refresh token is available.");
      }

      console.log(`Access token for ${inbox.email} expired. Refreshing...`);
      const { newAccessToken, newExpiresAt } = await refreshAccessToken(refresh_token);
      
      access_token = newAccessToken;
      expires_at = newExpiresAt.toISOString();

      // Update the inbox with the new token and expiry
      const { error: updateError } = await supabase
        .from("inboxes")
        .update({ access_token, expires_at })
        .eq("id", inbox_id);

      if (updateError) {
        console.error("Failed to update new access token in database:", updateError);
        // Continue with the new token anyway, but log the error
      }
    }

    // 3. Send the email
    await sendEmailWithGmail(
      access_token,
      inbox.email,
      contact_email,
      subject,
      body
    );

    return new Response(JSON.stringify({ message: "Email sent successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Send-email-worker error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});