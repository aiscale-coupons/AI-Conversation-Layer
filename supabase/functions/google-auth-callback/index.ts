// Supabase Edge Function: google-auth-callback
// This function handles the redirect from Google's OAuth 2.0 consent screen.
// It exchanges the authorization code for access and refresh tokens and saves them.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL"); // Your frontend URL for redirection

serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !FRONTEND_URL) {
    return new Response(
      JSON.stringify({ error: "Google OAuth credentials or frontend URL are not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // This should be the user_id
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    console.error("Google OAuth error:", errorParam);
    return new Response(null, {
      status: 302,
      headers: { Location: `${FRONTEND_URL}/inbox-connect?error=${errorParam}` },
    });
  }

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: "Missing code or state parameter." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Initialize Supabase client with the user's auth token to validate the JWT
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${state}` } } }
  );

  // Verify state (CSRF protection) - the state is the user's JWT
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Authentication error:", userError?.message);
    return new Response(null, {
      status: 302,
      headers: { Location: `${FRONTEND_URL}/inbox-connect?error=authentication_failed` },
    });
  }

  // Now, create a service role client to perform admin tasks
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Error exchanging code for tokens:", errorData);
      throw new Error("Failed to exchange code for tokens.");
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    const expires_at = new Date(Date.now() + expires_in * 1000);

    // Get user info (email and profile)
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json();
      console.error("Error fetching user info:", errorData);
      throw new Error("Failed to fetch user info.");
    }

    const userInfo = await userInfoResponse.json();
    const inboxEmail = userInfo.email;
    const providerId = userInfo.id; // Google user ID

    if (!inboxEmail) {
      throw new Error("Could not retrieve email from Google profile.");
    }

    // Save tokens and inbox info to the database
    const { data, error: dbError } = await supabaseAdmin
      .from("inboxes")
      .upsert(
        {
          user_id: user.id,
          email: inboxEmail,
          provider: 'google',
          provider_id: providerId,
          access_token: access_token,
          refresh_token: refresh_token,
          expires_at: expires_at.toISOString(),
          is_connected: true,
        },
        { onConflict: 'user_id,email', ignoreDuplicates: false } // Update if inbox email already exists for this user
      )
      .select();

    if (dbError) {
      console.error("Error saving inbox credentials:", dbError);
      throw new Error("Failed to save inbox credentials.");
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${FRONTEND_URL}/inbox-connect?success=true&email=${inboxEmail}` },
    });

  } catch (error) {
    console.error("OAuth callback error:", error.message);
    return new Response(null, {
      status: 302,
      headers: { Location: `${FRONTEND_URL}/inbox-connect?error=${encodeURIComponent(error.message)}` },
    });
  }
});
